from __future__ import annotations

import json
from pathlib import Path

import pytest

from plugins.memory.mangaba_rag import (
    MAX_UPLOAD_CHARS,
    _build_index,
    _chunk,
    _tokenize,
    extract_pdf_text,
    ingest_upload,
    list_uploaded_files,
    remove_uploaded_file,
)


@pytest.fixture(autouse=True)
def isolate_mangaba_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    home = tmp_path / ".mangaba"
    home.mkdir()
    monkeypatch.setenv("MANGABA_HOME", str(home))


SAMPLE_TEXT = (
    "A Mangaba é uma plataforma de inteligência artificial que ajuda empresas "
    "a automatizar processos com agentes de IA. O framework permite criar "
    "agentes que executam tarefas em qualquer canal e modelo. Mangaba é "
    "self-host, privado e seguro por padrão."
)


class TestChunk:
    def test_short_text_returns_single_chunk(self):
        assert _chunk("curto") == ["curto"]

    def test_long_text_splits_at_boundary(self):
        text = "palavra " * 500
        chunks = _chunk(text)
        assert len(chunks) > 1
        for c in chunks:
            assert len(c) <= 700

    def test_empty_text_returns_empty(self):
        assert _chunk("") == []


class TestTokenize:
    def test_removes_stopwords_and_short_tokens(self):
        tokens = _tokenize("a o de da inteligencia artificial")
        assert "a" not in tokens
        assert "o" not in tokens
        assert "inteligencia" in tokens
        assert "artificial" in tokens

    def test_empty_text_returns_empty(self):
        assert _tokenize("") == []


class TestBuildIndex:
    def test_builds_valid_index(self):
        chunks = [
            {"url": "t1", "title": "doc1", "text": "Mangaba inteligencia artificial", "source": "upload"},
            {"url": "t2", "title": "doc2", "text": "Framework agentes IA automate", "source": "upload"},
        ]
        index = _build_index(chunks, pages=0)
        assert "idf" in index
        assert "chunks" in index
        assert len(index["chunks"]) == 2
        for c in index["chunks"]:
            assert "vec" in c
            assert isinstance(c["vec"], dict)

    def test_empty_chunks_list_does_not_crash(self):
        index = _build_index([], pages=0)
        assert index["chunks"] == []


class TestIngestUpload:
    def test_indexes_text_and_returns_stats(self):
        result = ingest_upload("teste.txt", SAMPLE_TEXT)
        assert result["filename"] == "teste.txt"
        assert result["chunks"] >= 1

    def test_reupload_replaces_prior_version(self):
        r1 = ingest_upload("dup.txt", "versao um conteudo")
        r2 = ingest_upload("dup.txt", "versao dois conteudo diferente maior")
        files = list_uploaded_files()
        assert len(files) == 1
        assert files[0]["name"] == "dup.txt"

    def test_empty_text_raises(self):
        with pytest.raises(ValueError, match="vazio"):
            ingest_upload("vazio.txt", "")

    def test_respects_max_upload_chars(self):
        big = "a" * (MAX_UPLOAD_CHARS + 1000)
        result = ingest_upload("grande.txt", big)
        assert result["chunks"] >= 1


class TestListAndRemove:
    def test_list_uploaded_files(self):
        ingest_upload("a.txt", "conteudo do arquivo a")
        ingest_upload("b.txt", "conteudo do arquivo b")
        files = list_uploaded_files()
        assert len(files) == 2
        names = [f["name"] for f in files]
        assert "a.txt" in names
        assert "b.txt" in names

    def test_remove_uploaded_file(self):
        ingest_upload("remover.txt", "conteudo para remover")
        assert len(list_uploaded_files()) == 1
        assert remove_uploaded_file("remover.txt")
        assert len(list_uploaded_files()) == 0

    def test_remove_nonexistent_returns_false(self):
        assert not remove_uploaded_file("inexistente.txt")


class TestSearch:
    def test_prefetch_returns_relevant_chunks(self, isolate_mangaba_home):
        from plugins.memory.mangaba_rag import MangabaRAGProvider

        ingest_upload("mangaba.txt", SAMPLE_TEXT)

        provider = MangabaRAGProvider()
        provider.initialize(session_id="test")
        result = provider.prefetch("Mangaba inteligencia artificial")
        assert "Conhecimento mangaba.ia.br" in result
        assert "Mangaba" in result or "inteligência" in result or "inteligencia" in result

    def test_prefetch_empty_query_returns_empty(self, isolate_mangaba_home):
        from plugins.memory.mangaba_rag import MangabaRAGProvider

        ingest_upload("doc.txt", SAMPLE_TEXT)
        provider = MangabaRAGProvider()
        provider.initialize(session_id="test")
        assert provider.prefetch("") == ""


class TestExtractPdfText:
    def test_extract_text_from_pdf(self):
        fitz = pytest.importorskip("fitz", reason="PyMuPDF not installed")
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Mangaba IA texto extraido do PDF")
        pdf_bytes = doc.tobytes()
        doc.close()

        text = extract_pdf_text(pdf_bytes)
        assert "Mangaba IA" in text
        assert "PDF" in text

    def test_empty_pdf_raises(self):
        fitz = pytest.importorskip("fitz", reason="PyMuPDF not installed")
        doc = fitz.open()
        doc.new_page()
        # insert only whitespace — no extractable content
        page = doc[0]
        page.insert_text((50, 50), "   ")
        pdf_bytes = doc.tobytes()
        doc.close()

        with pytest.raises(ValueError, match="imagens|escaneado"):
            extract_pdf_text(pdf_bytes)

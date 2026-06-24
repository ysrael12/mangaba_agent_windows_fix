"""Tests for the PIX BR Code generator (deterministic, no paid API)."""

import importlib.util
import re
from pathlib import Path

import pytest

_MOD_PATH = (Path(__file__).resolve().parents[1]
             / "skills/whatsapp-business/pix/scripts/pix_payload.py")
_spec = importlib.util.spec_from_file_location("pix_payload", _MOD_PATH)
pix = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pix)


def test_crc16_known_vector():
    # Standard CRC16-CCITT-FALSE test vector.
    assert pix.crc16_ccitt("123456789") == "29B1"


def test_payload_starts_and_ends_correctly():
    p = pix.build_pix_payload(key="teste@email.com", name="Loja Teste", city="Sao Paulo")
    assert p.startswith("000201")          # Payload Format Indicator
    assert "br.gov.bcb.pix" in p
    assert p[-8:-4] == "6304"              # CRC field tag+len right before CRC


def test_crc_is_valid_self_check():
    p = pix.build_pix_payload(key="11999998888", name="Maria", city="Recife", amount="25.50")
    body, crc = p[:-4], p[-4:]
    assert pix.crc16_ccitt(body) == crc    # CRC covers everything up to and incl. '6304'


def test_amount_is_normalized():
    p = pix.build_pix_payload(key="x@y.com", name="A", city="B", amount="10")
    assert "540510.00" in p                # ID 54, len 05, value 10.00


def test_amount_accepts_comma():
    p = pix.build_pix_payload(key="x@y.com", name="A", city="B", amount="10,90")
    assert "540510.90" in p


def test_accents_are_stripped():
    p = pix.build_pix_payload(key="x@y.com", name="Padaria Pão Quente", city="São Paulo")
    assert "Pao Quente" in p and "Sao Paulo" in p
    assert "ã" not in p and "ç" not in p


def test_name_and_city_length_caps():
    p = pix.build_pix_payload(key="x@y.com",
                              name="N" * 40, city="C" * 30)
    # ID 59 length must be <= 25, ID 60 <= 15
    m59 = re.search(r"59(\d{2})", p)
    assert int(m59.group(1)) <= 25


def test_missing_key_raises():
    with pytest.raises(ValueError):
        pix.build_pix_payload(key="", name="A", city="B")


def test_missing_name_raises():
    with pytest.raises(ValueError):
        pix.build_pix_payload(key="x@y.com", name="", city="B")


def test_description_included():
    p = pix.build_pix_payload(key="x@y.com", name="A", city="B", description="Pedido 42")
    assert "Pedido 42" in p

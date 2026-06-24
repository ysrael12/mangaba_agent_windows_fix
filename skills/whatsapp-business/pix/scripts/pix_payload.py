#!/usr/bin/env python3
"""Gerador de cobrança PIX (BR Code / copia-e-cola) — padrão EMV® do BCB.

Diferencial Mangaba: gera um código PIX **válido e verificável** localmente, sem
API paga e sem depender da "inteligência" do modelo — é um algoritmo
determinístico (TLV EMV + CRC16-CCITT-FALSE). Funciona até num gemma grátis.

Uso:
    python pix_payload.py --key <chave> --name "<nome>" --city "<cidade>" \\
        [--amount 10.00] [--txid PEDIDO123] [--description "Pedido 123"] [--qr saida.png]

A saída é o "copia e cola" (string EMV). Com --qr, também grava um QR Code PNG
(requer 'qrcode'; instalado sob demanda).

Referência: Manual do BR Code / EMV QRCPS do Banco Central do Brasil.
"""

from __future__ import annotations

import argparse
import sys
import unicodedata


def crc16_ccitt(data: str) -> str:
    """CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) → 4 hex maiúsculos.

    Vetor de teste padrão: crc16('123456789') == '29B1'.
    """
    crc = 0xFFFF
    for ch in data.encode("utf-8"):
        crc ^= ch << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return f"{crc:04X}"


def _tlv(emv_id: str, value: str) -> str:
    """Campo EMV: ID(2) + LEN(2, com zero à esquerda) + VALUE."""
    return f"{emv_id}{len(value):02d}{value}"


def _sanitize(text: str, max_len: int) -> str:
    """Remove acentos e limita tamanho (campos EMV são ASCII e curtos)."""
    norm = unicodedata.normalize("NFKD", text)
    ascii_text = norm.encode("ascii", "ignore").decode("ascii")
    return ascii_text.strip()[:max_len]


def build_pix_payload(
    *,
    key: str,
    name: str,
    city: str,
    amount: str | None = None,
    txid: str = "***",
    description: str | None = None,
) -> str:
    """Monta o payload PIX (BR Code estático). Retorna o 'copia e cola'."""
    if not key:
        raise ValueError("chave PIX é obrigatória")
    name = _sanitize(name or "", 25)
    city = _sanitize(city or "", 15)
    if not name or not city:
        raise ValueError("nome do recebedor e cidade são obrigatórios")
    txid = _sanitize(txid or "***", 25) or "***"

    # Merchant Account Information (ID 26): GUI + chave (+ descrição opcional)
    mai = _tlv("00", "br.gov.bcb.pix") + _tlv("01", key)
    if description:
        mai += _tlv("02", _sanitize(description, 72))
    merchant_account = _tlv("26", mai)

    parts = [
        _tlv("00", "01"),                 # Payload Format Indicator
        _tlv("01", "11"),                 # Point of Initiation (11 = estático/reutilizável)
        merchant_account,
        _tlv("52", "0000"),               # Merchant Category Code
        _tlv("53", "986"),                # Moeda: BRL
    ]
    if amount:
        # normaliza para "0.00"
        valor = f"{float(str(amount).replace(',', '.')):.2f}"
        parts.append(_tlv("54", valor))   # Transaction Amount
    parts.extend([
        _tlv("58", "BR"),                 # País
        _tlv("59", name),                 # Nome do recebedor
        _tlv("60", city),                 # Cidade
        _tlv("62", _tlv("05", txid)),     # Additional Data Field (txid)
    ])
    payload = "".join(parts) + "6304"     # ID 63, len 04, antes do CRC
    return payload + crc16_ccitt(payload)


def write_qr(payload: str, path: str) -> bool:
    """Grava um QR Code PNG do payload. Retorna False se 'qrcode' faltar."""
    try:
        import qrcode  # type: ignore
    except ImportError:
        return False
    img = qrcode.make(payload)
    img.save(path)
    return True


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Gera cobrança PIX (BR Code copia-e-cola).")
    ap.add_argument("--key", required=True, help="Chave PIX (CPF/CNPJ/email/telefone/aleatória)")
    ap.add_argument("--name", required=True, help="Nome do recebedor (máx 25)")
    ap.add_argument("--city", required=True, help="Cidade do recebedor (máx 15)")
    ap.add_argument("--amount", help="Valor, ex: 10.00 (omitir = valor livre)")
    ap.add_argument("--txid", default="***", help="Identificador da cobrança (máx 25)")
    ap.add_argument("--description", help="Descrição opcional")
    ap.add_argument("--qr", help="Caminho do PNG do QR Code a gerar")
    args = ap.parse_args(argv)

    try:
        payload = build_pix_payload(
            key=args.key, name=args.name, city=args.city,
            amount=args.amount, txid=args.txid, description=args.description,
        )
    except ValueError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1

    print(payload)
    if args.qr:
        if write_qr(payload, args.qr):
            print(f"QR salvo em: {args.qr}", file=sys.stderr)
        else:
            print("Aviso: 'qrcode' não instalado — rode: pip install qrcode[pil]", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

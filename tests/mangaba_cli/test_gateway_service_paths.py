from pathlib import Path
from unittest.mock import patch


def test_service_path_skips_nonexistent_node_modules(tmp_path):
    """Service PATH should not include node_modules/.bin if it doesn't exist."""
    from mangaba_cli.gateway import _build_service_path_dirs
    with patch("mangaba_cli.gateway.get_mangaba_home", return_value=tmp_path / ".mangaba"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    node_modules_bin = str(tmp_path / "node_modules" / ".bin")
    assert node_modules_bin not in dirs


def test_service_path_includes_node_modules_when_present(tmp_path):
    """Service PATH should include node_modules/.bin when it exists."""
    nm_bin = tmp_path / "node_modules" / ".bin"
    nm_bin.mkdir(parents=True)
    from mangaba_cli.gateway import _build_service_path_dirs
    with patch("mangaba_cli.gateway.get_mangaba_home", return_value=tmp_path / ".mangaba"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    assert str(nm_bin) in dirs


def test_service_path_includes_mangaba_home_node_modules(tmp_path):
    """Service PATH should include ~/.mangaba/node_modules/.bin when it exists."""
    mangaba_nm = tmp_path / ".mangaba" / "node_modules" / ".bin"
    mangaba_nm.mkdir(parents=True)
    from mangaba_cli.gateway import _build_service_path_dirs
    with patch("mangaba_cli.gateway.get_mangaba_home", return_value=tmp_path / ".mangaba"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    assert str(mangaba_nm) in dirs

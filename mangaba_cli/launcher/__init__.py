"""System-tray launcher for the Mangaba Dashboard.

Packaged as its own PyInstaller target (``mangaba-launcher.exe``) with its
own ``Analysis`` in ``mangaba-agent.spec`` — kept separate from the
``mangaba``/``mangaba-acp``/``mangaba-dashboard`` bundle so ``pystray`` and
``Pillow`` don't get pulled into those three exes.

See ``SPEC_INSTALLER.md`` (Fase 7) for the design.
"""

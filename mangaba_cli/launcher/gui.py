"""GUI window for the Mangaba Dashboard launcher (CustomTkinter)."""

from __future__ import annotations

import threading
import tkinter as tk
from pathlib import Path

import customtkinter as ctk

from mangaba_cli.launcher.process_manager import DashboardProcessManager

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")


class LauncherWindow:
    def __init__(self, manager: DashboardProcessManager) -> None:
        self._manager = manager

        self._root = ctk.CTk()
        self._root.title("Mangaba Dashboard")
        self._root.resizable(False, False)

        icon_path = Path(__file__).parent / "resources" / "icon.ico"
        if icon_path.is_file():
            try:
                self._root.iconbitmap(str(icon_path))
            except Exception:
                pass

        self._root.protocol("WM_DELETE_WINDOW", self._on_close)

        frame = ctk.CTkFrame(self._root, corner_radius=12)
        frame.pack(padx=20, pady=20, fill="both", expand=True)

        ctk.CTkLabel(
            frame,
            text="Mangaba Dashboard",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).pack(pady=(16, 4))

        self._status_var = tk.StringVar(value="Parado")
        self._status_label = ctk.CTkLabel(
            frame,
            textvariable=self._status_var,
            font=ctk.CTkFont(size=13),
            text_color="gray",
        )
        self._status_label.pack(pady=(0, 16))

        btn_frame = ctk.CTkFrame(frame, fg_color="transparent")
        btn_frame.pack(pady=(0, 8))

        self._start_btn = ctk.CTkButton(
            btn_frame,
            text="Iniciar",
            command=self._on_start,
            width=130,
            fg_color="#2e7d32",
            hover_color="#1b5e20",
        )
        self._start_btn.pack(side="left", padx=(0, 6))

        self._stop_btn = ctk.CTkButton(
            btn_frame,
            text="Parar",
            command=self._on_stop,
            width=130,
            state="disabled",
            fg_color="#c62828",
            hover_color="#b71c1c",
        )
        self._stop_btn.pack(side="left", padx=(6, 0))

        ctk.CTkButton(
            frame,
            text="Abrir no Navegador",
            command=self._on_open,
            fg_color="transparent",
            border_width=1,
            text_color=("gray10", "gray90"),
        ).pack(pady=(4, 4), fill="x", padx=40)

        ctk.CTkButton(
            frame,
            text="Sair",
            command=self._on_exit,
            fg_color="transparent",
            hover_color=("gray85", "gray25"),
            text_color=("gray10", "gray90"),
        ).pack(pady=(0, 16), fill="x", padx=40)

        self._poll_interval_ms = 1000

    def _update_status(self, running: bool) -> None:
        if running:
            self._status_var.set(f"Rodando — porta {self._manager.port}")
            self._status_label.configure(text_color="#4caf50")
            self._start_btn.configure(state="disabled")
            self._stop_btn.configure(state="normal")
        else:
            self._status_var.set("Parado")
            self._status_label.configure(text_color="gray")
            self._start_btn.configure(state="normal")
            self._stop_btn.configure(state="disabled")

    def _poll_status(self) -> None:
        self._update_status(self._manager.is_running)
        self._root.after(self._poll_interval_ms, self._poll_status)

    def _on_start(self) -> None:
        threading.Thread(target=self._manager.start, daemon=True).start()

    def _on_stop(self) -> None:
        threading.Thread(target=self._manager.stop, daemon=True).start()

    def _on_open(self) -> None:
        import webbrowser
        webbrowser.open(f"http://127.0.0.1:{self._manager.port}")

    def _on_exit(self) -> None:
        self._manager.stop()
        self._manager.stop_gateway()
        self._root.quit()
        self._root.destroy()

    def _on_close(self) -> None:
        self._root.withdraw()

    def run(self) -> None:
        self._update_status(self._manager.is_running)
        self._poll_status()
        self._root.mainloop()

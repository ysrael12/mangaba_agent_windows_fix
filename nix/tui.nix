# nix/tui.nix — Mangaba TUI (Ink/React) compiled with tsc and bundled
{ pkgs, mangabaNpmLib, ... }:
let
  src = ../ui-tui;
  npmDeps = pkgs.fetchNpmDeps {
    inherit src;
    hash = "sha256-F6/MzZOWc0zhW9mIfnaY+PrllPvJcsA/OdFdEM+NpLY=";
  };

  npm = mangabaNpmLib.mkNpmPassthru { folder = "ui-tui"; attr = "tui"; pname = "mangaba-tui"; };

  packageJson = builtins.fromJSON (builtins.readFile (src + "/package.json"));
  version = packageJson.version;
in
pkgs.buildNpmPackage (npm // {
  pname = "mangaba-tui";
  inherit src npmDeps version;

  doCheck = false;
  npmFlags = [ "--legacy-peer-deps" ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/lib/mangaba-tui

    # Single self-contained bundle built by scripts/build.mjs (esbuild).
    cp -r dist $out/lib/mangaba-tui/dist

    # package.json kept for "type": "module" resolution on `node dist/entry.js`.
    cp package.json $out/lib/mangaba-tui/

    runHook postInstall
  '';
})

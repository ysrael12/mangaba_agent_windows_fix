# nix/packages.nix — Mangaba Agent package built with uv2nix
{ inputs, ... }:
{
  perSystem =
    { pkgs, inputs', ... }:
    let
      mangabaAgent = pkgs.callPackage ./mangaba-agent.nix {
        inherit (inputs) uv2nix pyproject-nix pyproject-build-systems;
        npm-lockfile-fix = inputs'.npm-lockfile-fix.packages.default;
        # Only embed clean revs — dirtyRev doesn't represent any upstream
        # commit, so comparing it would always claim "update available".
        rev = inputs.self.rev or null;
      };
    in
    {
      packages = {
        default = mangabaAgent;
        tui = mangabaAgent.mangabaTui;
        web = mangabaAgent.mangabaWeb;

        fix-lockfiles = mangabaAgent.mangabaNpmLib.mkFixLockfiles {
          packages = [ mangabaAgent.mangabaTui mangabaAgent.mangabaWeb ];
        };
      };
    };
}

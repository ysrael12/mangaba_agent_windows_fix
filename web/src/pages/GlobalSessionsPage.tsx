import { useEffect, useState } from "react";
import { Clock, Globe } from "lucide-react";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { useI18n } from "@/i18n";
import { fetchJSON } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

interface FleetSession {
  id: string;
  title: string | null;
  // Backend (list_sessions_rich) devolve `source` (telegram/discord/cli/…) e
  // `last_active` como epoch em SEGUNDOS — não `platform`/`session_id`/string.
  source: string | null;
  last_active: number;
  message_count: number;
  _profile: string;
  _profile_running: boolean;
}

interface FleetSessionsResponse {
  sessions: FleetSession[];
  total: number;
}

const LIMIT = 15;

function parseSource(session: FleetSession): string {
  return session.source ?? "local";
}

export default function GlobalSessionsPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<FleetSession[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (currentOffset: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON<FleetSessionsResponse>(
        `/api/sessions/fleet?limit=${LIMIT}&offset=${currentOffset}`,
      );
      setSessions((prev) =>
        append ? [...prev, ...data.sessions] : data.sessions,
      );
      setTotal(data.total);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchSessions(0);
  }, []);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    void fetchSessions(nextOffset, true);
  };

  const { globalSessions: gs } = t;
  const labelAllProfiles = gs.allProfiles;
  const labelNoSessions = gs.noSessions;
  const labelLoadMore = gs.loadMore;
  const labelTitle = gs.title;

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-muted-foreground" />
        <h1 className="font-mondwest text-display text-lg tracking-[0.08em]">
          {labelTitle}
        </h1>
        {!loading && (
          <Badge tone="secondary" className="text-xs tabular-nums">
            {total}
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{labelAllProfiles}</p>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="text-2xl text-primary" />
        </div>
      ) : error ? (
        <div className="border border-destructive/30 bg-destructive/[0.06] p-4 text-sm text-destructive">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm font-medium">{labelNoSessions}</p>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-1.5">
            {sessions.map((s) => (
              <div
                key={`${s._profile}:${s.id}`}
                className="flex min-w-0 items-start gap-3 border border-border p-3 transition-colors hover:bg-secondary/30"
              >
                <Globe className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge
                      tone={s._profile_running ? "success" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {s._profile}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {s.title ?? t.sessions.untitledSession}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <Badge tone="outline" className="text-xs">
                      {parseSource(s)}
                    </Badge>
                    <span className="text-border">&#183;</span>
                    <span className="shrink-0">
                      {s.message_count} {t.common.msgs}
                    </span>
                    <span className="text-border">&#183;</span>
                    <span className="shrink-0">{timeAgo(s.last_active)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sessions.length < total && (
            <div className="flex justify-center pt-2">
              <Button
                outlined
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Spinner className="mr-2 text-[0.875rem]" />
                ) : null}
                {labelLoadMore}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

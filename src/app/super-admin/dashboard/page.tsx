
import { db } from "@/db";
import { errorLog, jobRun } from "@/db/schema";
import { desc } from "drizzle-orm";
import React from "react";

export default async function SuperAdminDashboard(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await props.searchParams;
  const currentTab = params?.tab || "errors";

  // Fetch data
  const errors = await db
    .select()
    .from(errorLog)
    .orderBy(desc(errorLog.createdAt))
    .limit(100);

  const jobs = await db
    .select()
    .from(jobRun)
    .orderBy(desc(jobRun.startedAt))
    .limit(100);

  return (
    <div>
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid #333", paddingBottom: "16px", marginBottom: "24px" }}>
        <a 
          href="?tab=errors" 
          style={{ 
            color: currentTab === "errors" ? "#fff" : "#888",
            textDecoration: "none",
            fontWeight: currentTab === "errors" ? "bold" : "normal",
            padding: "8px 16px",
            backgroundColor: currentTab === "errors" ? "#222" : "transparent",
            borderRadius: "4px"
          }}
        >
          Error Logs ({errors.length})
        </a>
        <a 
          href="?tab=cron" 
          style={{ 
            color: currentTab === "cron" ? "#fff" : "#888",
            textDecoration: "none",
            fontWeight: currentTab === "cron" ? "bold" : "normal",
            padding: "8px 16px",
            backgroundColor: currentTab === "cron" ? "#222" : "transparent",
            borderRadius: "4px"
          }}
        >
          Cron Jobs ({jobs.length})
        </a>
      </div>

      {currentTab === "errors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {errors.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#888", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
              No errors logged yet. System is healthy.
            </div>
          ) : (
            errors.map((log) => (
              <div key={log.id} style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ backgroundColor: "#3a1a1a", color: "#ff8888", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                      {log.source.toUpperCase()}
                    </span>
                    <span style={{ color: "#aaa", fontSize: "13px" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div style={{ fontWeight: "bold", marginBottom: "12px", fontSize: "15px" }}>
                  {log.message}
                </div>

                {log.stackTrace && (
                  <details style={{ marginBottom: "12px" }}>
                    <summary style={{ cursor: "pointer", color: "#888", fontSize: "13px", marginBottom: "8px" }}>View Stack Trace</summary>
                    <pre style={{ backgroundColor: "#000", padding: "12px", borderRadius: "4px", overflowX: "auto", fontSize: "12px", color: "#ffaaaa", margin: 0 }}>
                      {log.stackTrace}
                    </pre>
                  </details>
                )}

                {!!log.context && (
                  <details>
                    <summary style={{ cursor: "pointer", color: "#888", fontSize: "13px", marginBottom: "8px" }}>View Context</summary>
                    <pre style={{ backgroundColor: "#000", padding: "12px", borderRadius: "4px", overflowX: "auto", fontSize: "12px", color: "#88ccff", margin: 0 }}>
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {currentTab === "cron" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {jobs.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#888", backgroundColor: "#1a1a1a", borderRadius: "8px" }}>
              No cron jobs have run yet.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} style={{ 
                backgroundColor: "#1a1a1a", 
                border: "1px solid", 
                borderColor: job.outcome === "success" ? "#1a3a1a" : job.outcome === "failed" ? "#3a1a1a" : "#3a3a1a",
                borderRadius: "8px", 
                padding: "16px" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ 
                      backgroundColor: job.outcome === "success" ? "#1a3a1a" : job.outcome === "failed" ? "#3a1a1a" : "#3a3a1a", 
                      color: job.outcome === "success" ? "#88ff88" : job.outcome === "failed" ? "#ff8888" : "#aaaaaa", 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px", 
                      fontWeight: "bold" 
                    }}>
                      {job.outcome.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                      {job.jobKey}
                    </span>
                  </div>
                  <div style={{ color: "#aaa", fontSize: "13px" }}>
                    {new Date(job.startedAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#ccc", marginBottom: "12px" }}>
                  <div>
                    <span style={{ color: "#888" }}>Duration: </span>
                    {job.finishedAt ? `${(new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime())}ms` : "Running..."}
                  </div>
                </div>

                {!!job.counts && (
                  <div style={{ backgroundColor: "#000", padding: "12px", borderRadius: "4px", fontSize: "13px", color: "#ccc", marginBottom: "12px" }}>
                    <span style={{ color: "#888" }}>Counts: </span>
                    {JSON.stringify(job.counts)}
                  </div>
                )}

                {job.error && (
                  <div style={{ backgroundColor: "#3a1a1a", padding: "12px", borderRadius: "4px", fontSize: "13px", color: "#ffaaaa" }}>
                    <span style={{ color: "#ff8888", fontWeight: "bold" }}>Error: </span>
                    {job.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

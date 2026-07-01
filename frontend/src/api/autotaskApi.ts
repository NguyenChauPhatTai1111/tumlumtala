import { apiClient } from "./client";

export interface FetchTitleResponse {
  title: string;
  issue_id: string;
  issue_url: string;
  user_story_id: number;
  user_story_url: string;
  start_date: string;
  estimated_hours: number | null;
  comtors: { id: number; name: string }[];
  pull_request_url: string;
  task_subject: string;
}

export async function fetchRedmineTitle(issueId: string): Promise<FetchTitleResponse> {
  const res = await apiClient.post<{ data: FetchTitleResponse }>("/autotask/fetch-title", {
    issue_id: issueId,
  });
  return res.data.data;
}

export interface Job {
  id: number;
  company: string;
  position: string;
  location: string;
  status: "applied" | "interview" | "offer" | "rejected";
  link: string;
  createdAt: string;
}

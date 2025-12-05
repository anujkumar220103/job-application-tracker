import { Job } from "@/types";

interface JobCardProps {
  job: Job;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number) => void; // 👈 new optional update handler
}

export default function JobCard({ job, onDelete, onUpdate }: JobCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg text-gray-800">{job.position}</h3>
        <p className="text-gray-600">{job.company}</p>
        <p className="text-sm text-gray-500">{job.location}</p>
        <p
          className={`text-sm mt-2 font-medium ${
            job.status === "applied"
              ? "text-blue-600"
              : job.status === "interview"
              ? "text-yellow-600"
              : job.status === "offer"
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {job.status.toUpperCase()}
        </p>

        {job.link && (
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-sm mt-2 inline-block"
          >
            View Application ↗
          </a>
        )}
      </div>

      {/* 🟨 Update & 🟥 Delete buttons */}
      <div className="mt-4 flex gap-2">
        {onUpdate && (
          <button
            onClick={() => onUpdate(job.id)}
            className="px-3 py-1.5 text-sm font-semibold bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors cursor-pointer"
          >
            Update
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(job.id)}
            className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

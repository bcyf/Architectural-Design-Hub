import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { useListResources, useListJobs } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Briefcase, ExternalLink, MonitorPlay, BookOpen, Video, File, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

function getResourceIcon(type: string) {
  switch (type) {
    case "book": return <BookOpen size={22} />;
    case "video": return <Video size={22} />;
    case "tutorial": return <MonitorPlay size={22} />;
    case "software": return <MonitorPlay size={22} />;
    default: return <FileText size={22} />;
  }
}

function isDirectVideo(url: string) {
  return url && url.match(/\.(mp4|webm|mov|avi|mkv)/i);
}

interface ActiveVideo {
  src: string;
  title: string;
  description?: string;
  type?: string;
}

export default function Resources() {
  const { data: resources, isLoading: resourcesLoading } = useListResources();
  const { data: jobs, isLoading: jobsLoading } = useListJobs();
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);

  const handleWatchVideo = (resource: any) => {
    if (resource.fileUrl && isDirectVideo(resource.fileUrl)) {
      setActiveVideo({
        src: resource.fileUrl,
        title: resource.title,
        description: resource.description,
        type: resource.type,
      });
    } else if (resource.fileUrl) {
      window.open(resource.fileUrl, "_blank", "noreferrer");
    }
  };

  const renderResourceCard = (resource: any) => {
    const isVideo = resource.type === "video";
    const hasDirectVideo = isDirectVideo(resource.fileUrl);

    return (
      <div key={resource.id} className="border border-border hover:border-primary transition-colors bg-card flex flex-col h-full group">

        {/* Thumbnail / video preview area */}
        {resource.imageUrl ? (
          <div
            className={`relative w-full h-44 overflow-hidden ${isVideo ? "cursor-pointer" : ""}`}
            onClick={isVideo ? () => handleWatchVideo(resource) : undefined}
          >
            <img src={resource.imageUrl} alt={resource.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {isVideo && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/15 border border-white/40 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : isVideo && resource.fileUrl && hasDirectVideo ? (
          <div
            className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer"
            onClick={() => handleWatchVideo(resource)}
          >
            <video
              src={resource.fileUrl}
              className="w-full h-full object-cover opacity-70"
              preload="metadata"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/15 border border-white/40 flex items-center justify-center backdrop-blur-sm">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="p-6 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {getResourceIcon(resource.type)}
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{resource.type}</span>
          </div>

          <h3 className="text-lg font-display font-bold mb-2 leading-tight">{resource.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 flex-grow">{resource.description}</p>

          {resource.software && (
            <span className="inline-block bg-muted px-2 py-1 text-xs font-medium mb-4 w-fit">
              {resource.software}
            </span>
          )}

          {resource.fileUrl ? (
            isVideo && hasDirectVideo ? (
              <Button
                className="w-full rounded-none mt-auto gap-2"
                onClick={() => handleWatchVideo(resource)}
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Video
              </Button>
            ) : (
              <Button variant="outline" className="w-full rounded-none mt-auto gap-2" asChild>
                <a href={resource.fileUrl} target="_blank" rel="noreferrer" download={resource.type === "book"}>
                  {isVideo
                    ? <><MonitorPlay className="w-4 h-4" />Open Video</>
                    : <><Download className="w-4 h-4" />Download</>
                  }
                </a>
              </Button>
            )
          ) : (
            <Button variant="outline" className="w-full rounded-none mt-auto gap-2" disabled>
              <File className="w-4 h-4" />No File Available
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderJobCard = (job: any) => (
    <div key={job.id} className="border border-border hover:border-primary transition-colors bg-card flex flex-col h-full">
      {job.imageUrl && (
        <div className="w-full h-40 overflow-hidden">
          <img src={job.imageUrl} alt={job.company} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-display font-bold">{job.title}</h3>
            <p className="text-primary font-medium">{job.company}</p>
          </div>
          <span className="px-3 py-1 bg-secondary text-xs font-medium uppercase tracking-wider shrink-0 ml-2">
            {job.type}
          </span>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground mb-4">
          <p><strong>Location:</strong> {job.location}</p>
          {job.deadline && <p><strong>Deadline:</strong> {job.deadline}</p>}
        </div>

        <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow">{job.description}</p>

        <Button className="w-full rounded-none mt-auto gap-2" asChild>
          <a href={job.applicationUrl || "#"} target="_blank" rel="noreferrer">
            Apply Now
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <PageWrapper>
      {/* Video player modal */}
      <VideoPlayerModal
        open={!!activeVideo}
        onClose={() => setActiveVideo(null)}
        src={activeVideo?.src || ""}
        title={activeVideo?.title || ""}
        description={activeVideo?.description}
        type={activeVideo?.type}
      />

      <div className="bg-foreground text-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Members Hub</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Essential tools, guides, books, videos, and career opportunities curated for ASA members.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="resources" className="w-full">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border mb-12 rounded-none">
            <TabsTrigger
              value="resources"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-4 px-6 text-base"
            >
              <FileText className="w-4 h-4 mr-2" />
              Academic Toolkit
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-4 px-6 text-base"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Job Board
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {resourcesLoading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted animate-pulse" />)
              ) : resources && resources.length > 0 ? (
                resources.map(renderResourceCard)
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border">
                  No resources available right now.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobsLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse" />)
              ) : jobs && jobs.length > 0 ? (
                jobs.map(renderJobCard)
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border">
                  No job postings available right now.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

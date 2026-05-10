import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { useListResources, useListJobs } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Download, Briefcase, ExternalLink,
  MonitorPlay, BookOpen, Video, File, Play,
  Link2, Mail, Check
} from "lucide-react";
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

function ShareBar({ title, description }: { title: string; description?: string }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/resources` : "/resources";
  const text = `${title} — ${description || "Check out this resource from ASA FBC"}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`,
      icon: (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
    {
      label: "X",
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${pageUrl}`)}`,
      icon: <Mail className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-border">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mr-1">Share</span>

      {shareLinks.map(({ label, href, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          title={`Share on ${label}`}
          className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          {icon}
        </a>
      ))}

      <button
        onClick={handleCopy}
        title="Copy link"
        className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors ml-auto"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Link2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
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

          <ShareBar title={resource.title} description={resource.description} />
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

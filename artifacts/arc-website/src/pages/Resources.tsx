import { PageWrapper } from "@/components/layout/PageWrapper";
import { useListResources, useListJobs } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Briefcase, ExternalLink, MonitorPlay, BookOpen, Video, File } from "lucide-react";
import { Button } from "@/components/ui/button";

function getResourceIcon(type: string) {
  switch (type) {
    case "book": return <BookOpen size={24} />;
    case "video": return <Video size={24} />;
    case "tutorial": return <MonitorPlay size={24} />;
    case "software": return <MonitorPlay size={24} />;
    default: return <FileText size={24} />;
  }
}

function isVideo(url: string) {
  return url && url.match(/\.(mp4|webm|mov|avi|mkv)/i);
}

export default function Resources() {
  const { data: resources, isLoading: resourcesLoading } = useListResources();
  const { data: jobs, isLoading: jobsLoading } = useListJobs();

  const renderResourceCard = (resource: any) => (
    <div key={resource.id} className="border border-border hover:border-primary transition-colors bg-card flex flex-col h-full group">
      {/* Video embed preview */}
      {resource.type === "video" && resource.fileUrl && isVideo(resource.fileUrl) && (
        <div className="w-full aspect-video bg-black overflow-hidden">
          <video
            src={resource.fileUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            controls={false}
            muted
            onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
            onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {getResourceIcon(resource.type)}
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{resource.type}</span>
        </div>
        <h3 className="text-xl font-display font-bold mb-2">{resource.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 flex-grow">{resource.description}</p>

        {resource.software && (
          <span className="inline-block bg-muted px-2 py-1 text-xs font-medium mb-4 w-fit">
            {resource.software}
          </span>
        )}

        {resource.fileUrl ? (
          <Button
            variant="outline"
            className="w-full rounded-none mt-auto"
            asChild
          >
            <a href={resource.fileUrl} target="_blank" rel="noreferrer" download={resource.type === "book"}>
              {resource.type === "video" ? (
                <><MonitorPlay className="w-4 h-4 mr-2" />Watch Video</>
              ) : (
                <><Download className="w-4 h-4 mr-2" />Download</>
              )}
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="w-full rounded-none mt-auto" disabled>
            <File className="w-4 h-4 mr-2" />No File Available
          </Button>
        )}
      </div>
    </div>
  );

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

        <Button className="w-full rounded-none mt-auto" asChild>
          <a href={job.applicationUrl || '#'} target="_blank" rel="noreferrer">
            Apply Now
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );

  return (
    <PageWrapper>
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

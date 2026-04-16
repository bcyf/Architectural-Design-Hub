import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListTeamMembers } from "@workspace/api-client-react";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MOCK_TEAM = [
  { id: 1, name: "Elena Rodriguez", position: "President", year: "4th Year", bio: "Passionate about sustainable urban design and community engagement.", interests: "Parametric Design, Urbanism", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80", order: 1, isPreviousExec: false, academicYear: null },
  { id: 2, name: "Marcus Chen", position: "Vice President", year: "3rd Year", bio: "Focusing on the intersection of technology and traditional building methods.", interests: "Digital Fabrication, Materiality", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80", order: 2, isPreviousExec: false, academicYear: null },
  { id: 3, name: "Jordan Smith", position: "Events Coordinator", year: "4th Year", bio: "Dedicated to creating meaningful experiences for architecture students.", interests: "Exhibition Design, History", imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&q=80", order: 3, isPreviousExec: false, academicYear: null },
  { id: 4, name: "Aisha Patel", position: "Treasurer", year: "2nd Year", bio: "Managing resources to ensure maximum impact for our members.", interests: "Housing, Economy of Space", imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80", order: 4, isPreviousExec: false, academicYear: null },
];

function MemberCard({ member }: { member: any }) {
  return (
    <Card className="rounded-none border-none shadow-none bg-transparent group">
      <div className="aspect-[3/4] overflow-hidden mb-4 relative">
        <img
          src={member.imageUrl || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=500&q=80"}
          alt={member.name}
          className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
          {member.email && (
            <a href={`mailto:${member.email}`} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
              <Mail size={18} />
            </a>
          )}
          {member.instagram && (
            <a href={member.instagram} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
              <Instagram size={18} />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
              <Linkedin size={18} />
            </a>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        <h3 className="font-display font-bold text-xl">{member.name}</h3>
        <p className="text-primary text-sm font-medium mb-2">{member.position} • {member.year}</p>
        <p className="text-muted-foreground text-sm mb-3">{member.bio}</p>
        <p className="text-xs text-foreground/60 uppercase tracking-wider">Interests: {member.interests}</p>
      </CardContent>
    </Card>
  );
}

export default function About() {
  const { data: teamData, isLoading } = useListTeamMembers();
  const allMembers = teamData?.length ? teamData : MOCK_TEAM;

  const currentExecs = allMembers
    .filter((m: any) => !m.isPreviousExec)
    .sort((a: any, b: any) => a.order - b.order);

  const previousExecs = allMembers
    .filter((m: any) => m.isPreviousExec)
    .sort((a: any, b: any) => {
      if (a.academicYear && b.academicYear) return b.academicYear.localeCompare(a.academicYear);
      return a.order - b.order;
    });

  const previousByYear = previousExecs.reduce((acc: Record<string, any[]>, m: any) => {
    const yr = m.academicYear || "Other";
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(m);
    return acc;
  }, {});

  return (
    <PageWrapper>
      {/* Page Header */}
      <div className="bg-foreground text-background py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src={`${import.meta.env.BASE_URL}images/about-bg.png`}
            alt="Texture"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">About ARC.</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            We are a student-run organization dedicated to enriching the academic and professional lives of architecture students.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeader title="Our Mission" subtitle="Why We Exist" />
              <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                <p>
                  The Architecture Student Association FBC serves as the bridge between the academic studio environment and the professional architectural world. We exist to support, inspire, and advocate for architecture students throughout their educational journey.
                </p>
                <p>
                  Through workshops, guest lectures, social events, and networking opportunities, we strive to build a cohesive community that celebrates design excellence and diverse perspectives.
                </p>
                <p className="font-medium text-foreground border-l-4 border-primary pl-4 py-1">
                  "Our goal is to ensure no student drafts alone."
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 mt-8">
                <img src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=600&q=80" alt="Students working" className="w-full h-64 object-cover" />
                <img src="https://pixabay.com/get/g54a299588aa44fe631d0a11c588f200aa01c31b2fc2ed16229bc54ee750e1c66a0265587d9d88be89245bbac054cf55b2714c58257077ada272deb8afe0189d4_1280.jpg" alt="Models" className="w-full h-48 object-cover" />
              </div>
              <div className="space-y-4">
                <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80" alt="Lecture" className="w-full h-48 object-cover" />
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Sketches" className="w-full h-64 object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Executive Board */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Executive Board" subtitle="Meet the Team" centered />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-96 bg-muted animate-pulse" />)
            ) : currentExecs.length > 0 ? (
              currentExecs.map((member: any) => <MemberCard key={member.id} member={member} />)
            ) : (
              <p className="col-span-4 text-center text-muted-foreground py-12">No current executives listed yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Previous Executives */}
      {!isLoading && previousExecs.length > 0 && (
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Previous Executives" subtitle="Our Legacy" centered />

            {Object.entries(previousByYear).map(([year, members]) => (
              <div key={year} className="mt-14 first:mt-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-4 py-1.5 border border-border">
                    {year}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                  {(members as any[]).sort((a, b) => a.order - b.order).map((member: any) => (
                    <div key={member.id} className="group">
                      <div className="aspect-square overflow-hidden mb-3 relative">
                        <img
                          src={member.imageUrl || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=500&q=80"}
                          alt={member.name}
                          className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                          {member.email && (
                            <a href={`mailto:${member.email}`} className="w-9 h-9 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                              <Mail size={16} />
                            </a>
                          )}
                          {member.instagram && (
                            <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                              <Instagram size={16} />
                            </a>
                          )}
                          {member.linkedin && (
                            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                              <Linkedin size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-primary text-xs font-medium mt-0.5">{member.position}{member.year ? ` • ${member.year}` : ""}</p>
                      {member.bio && (
                        <p className="text-muted-foreground text-xs leading-relaxed mt-2 mb-1">{member.bio}</p>
                      )}
                      {member.interests && (
                        <p className="text-xs text-foreground/60 uppercase tracking-wider">Interests: {member.interests}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageWrapper>
  );
}

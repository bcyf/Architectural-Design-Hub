import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListTeamMembers } from "@workspace/api-client-react";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MOCK_TEAM = [
  { id: 1, name: "Elena Rodriguez", position: "President", year: "4th Year", bio: "Passionate about sustainable urban design and community engagement.", interests: "Parametric Design, Urbanism", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80", order: 1 },
  { id: 2, name: "Marcus Chen", position: "Vice President", year: "3rd Year", bio: "Focusing on the intersection of technology and traditional building methods.", interests: "Digital Fabrication, Materiality", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80", order: 2 },
  { id: 3, name: "Jordan Smith", position: "Events Coordinator", year: "4th Year", bio: "Dedicated to creating meaningful experiences for architecture students.", interests: "Exhibition Design, History", imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&q=80", order: 3 },
  { id: 4, name: "Aisha Patel", position: "Treasurer", year: "2nd Year", bio: "Managing resources to ensure maximum impact for our members.", interests: "Housing, Economy of Space", imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80", order: 4 },
];

export default function About() {
  const { data: teamData, isLoading } = useListTeamMembers();
  const team = teamData?.length ? teamData : MOCK_TEAM;

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
                  The ARC Student Association serves as the bridge between the academic studio environment and the professional architectural world. We exist to support, inspire, and advocate for architecture students throughout their educational journey.
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
                {/* about page architecture students working */}
                <img src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=600&q=80" alt="Students working" className="w-full h-64 object-cover" />
                {/* about page architectural models */}
                <img src="https://pixabay.com/get/g54a299588aa44fe631d0a11c588f200aa01c31b2fc2ed16229bc54ee750e1c66a0265587d9d88be89245bbac054cf55b2714c58257077ada272deb8afe0189d4_1280.jpg" alt="Models" className="w-full h-48 object-cover" />
              </div>
              <div className="space-y-4">
                {/* about page architecture lecture */}
                <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80" alt="Lecture" className="w-full h-48 object-cover" />
                {/* about page architecture sketches */}
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Sketches" className="w-full h-64 object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Executive Board" subtitle="Meet the Team" centered />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-96 bg-muted animate-pulse" />)
            ) : (
              team?.sort((a: any, b: any) => a.order - b.order).map((member: any) => (
                <Card key={member.id} className="rounded-none border-none shadow-none bg-transparent group">
                  <div className="aspect-[3/4] overflow-hidden mb-4 relative">
                    <img 
                      src={member.imageUrl || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=500&q=80"} 
                      alt={member.name} 
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                      <a href={`mailto:${member.email || '#'}`} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                        <Mail size={18} />
                      </a>
                      <a href={member.instagram || '#'} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                        <Instagram size={18} />
                      </a>
                      <a href={member.linkedin || '#'} className="w-10 h-10 bg-background text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors">
                        <Linkedin size={18} />
                      </a>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <h3 className="font-display font-bold text-xl">{member.name}</h3>
                    <p className="text-primary text-sm font-medium mb-2">{member.position} • {member.year}</p>
                    <p className="text-muted-foreground text-sm mb-3">{member.bio}</p>
                    <p className="text-xs text-foreground/60 uppercase tracking-wider">Interests: {member.interests}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

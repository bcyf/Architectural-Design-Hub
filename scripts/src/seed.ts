import {
  db,
  eventsTable,
  newsTable,
  teamTable,
  galleryTable,
  resourcesTable,
  jobsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(eventsTable);
  await db.delete(newsTable);
  await db.delete(teamTable);
  await db.delete(galleryTable);
  await db.delete(resourcesTable);
  await db.delete(jobsTable);

  // Events
  await db.insert(eventsTable).values([
    {
      title: "Annual Design Critique Night",
      description:
        "Join us for our flagship end-of-semester critique event where students present their studio projects to a panel of faculty and industry professionals. Refreshments provided.",
      date: "2026-04-15",
      time: "6:00 PM",
      location: "Architecture Building, Main Studio",
      type: "critique",
      imageUrl: "/images/hero-concrete.png",
      isUpcoming: true,
      rsvpCount: 47,
    },
    {
      title: "Rhino 3D Modelling Workshop",
      description:
        "A hands-on workshop covering advanced Rhino 3D techniques including NURBS surfaces, parametric design with Grasshopper, and rendering with V-Ray. Beginner to intermediate level.",
      date: "2026-04-22",
      time: "2:00 PM",
      location: "Computer Lab, Room 204",
      type: "workshop",
      imageUrl: "/images/hero-blueprint.png",
      isUpcoming: true,
      rsvpCount: 32,
    },
    {
      title: "Architecture Career Pathways Lecture",
      description:
        "Industry professionals from leading architecture firms share insights into different career paths in architecture — from urban design to interior architecture, research, and entrepreneurship.",
      date: "2026-05-03",
      time: "5:30 PM",
      location: "Auditorium, Block A",
      type: "lecture",
      imageUrl: "/images/hero-model.png",
      isUpcoming: true,
      rsvpCount: 89,
    },
    {
      title: "End-of-Year Social & Exhibition",
      description:
        "Celebrate the end of the academic year with your peers! Student work exhibition, food, music, and awards ceremony recognizing outstanding student achievements.",
      date: "2026-06-10",
      time: "7:00 PM",
      location: "Architecture Courtyard",
      type: "social",
      imageUrl: "/images/about-bg.png",
      isUpcoming: true,
      rsvpCount: 124,
    },
    {
      title: "Sustainable Design Competition Launch",
      description:
        "Launch event for our annual sustainable design competition. This year's brief focuses on low-carbon community housing. Teams of 2-4 students welcome.",
      date: "2026-05-20",
      time: "4:00 PM",
      location: "Studio 3, Level 2",
      type: "competition",
      imageUrl: "/images/hero-concrete.png",
      isUpcoming: true,
      rsvpCount: 61,
    },
  ]);
  console.log("Events seeded");

  // News/Blog Posts
  await db.insert(newsTable).values([
    {
      title: "Our Students Win National Competition",
      excerpt:
        "Three teams from our association took home awards at the National Student Architecture Competition 2026, with first place going to the 'Urban Canopy' project.",
      content: `We are incredibly proud to announce that our students have once again demonstrated excellence on the national stage. At the 2026 National Student Architecture Competition held in Sydney last weekend, three teams representing ARC Student Association brought home prestigious awards.\n\nFirst place in the Sustainable Design category was awarded to Sarah Chen and Marcus Williams for their remarkable 'Urban Canopy' project — a proposal for transforming underutilised rooftops into productive green spaces that simultaneously address urban heat islands and food security.\n\nSecond place in the Urban Futures category went to Jordan Park and Priya Nair for their 'Vertical Village' concept, a modular high-density housing proposal that challenges conventional approaches to community living in dense urban environments.\n\nA special commendation was also given to the team of five who entered the Heritage Adaptation category with their sensitive reinterpretation of a historic industrial warehouse.\n\nCongratulations to all our participants. You make the association proud!`,
      category: "news",
      author: "Jamie Thornton",
      authorRole: "President, ARC Student Association",
      imageUrl: "/images/hero-concrete.png",
      readTime: 4,
    },
    {
      title: "The Case for Hand Drawing in a Digital Age",
      excerpt:
        "As digital tools dominate our studios, one third-year student makes a passionate argument for why the pencil should remain central to architectural education.",
      content: `There's something happening in studios that concerns me. I look around and see screens glowing, mice clicking, and keyboards rattling — but very few pencils moving. We've become so fluent in Rhino and Revit that we've started to lose something fundamental: the direct connection between mind, hand, and mark.\n\nI'm not a Luddite. I use Rhino every day, and I'm grateful for it. But when I watch experienced architects work, the ones who are truly exceptional almost always have sketchbooks full of quick, gestural drawings. Not polished renderings — messy, exploratory drawings that capture an idea in ten seconds.\n\nHand drawing forces a different kind of thinking. When you can't undo, you commit. You develop judgment. You learn to see what's essential and what's noise. The line you make is a decision, and decisions have consequences.\n\nI'd encourage every architecture student to put down the mouse for an hour each day and just draw. Draw the building you walk past. Draw the detail you're struggling with. Draw your idea before you model it. You might be surprised what emerges.`,
      category: "opinion",
      author: "Mia Kowalski",
      authorRole: "3rd Year Architecture Student",
      imageUrl: "/images/hero-blueprint.png",
      readTime: 6,
    },
    {
      title: "Alumni Spotlight: Five Years After Graduation",
      excerpt:
        "We catch up with alumni Reza Ahmadi, who completed his degree five years ago and is now a Project Architect at one of the country's leading sustainable design firms.",
      content: `Five years ago, Reza Ahmadi was sitting in the same studios many of you occupy today, pulling all-nighters before critiques and wondering what the profession actually looked like from the inside. Today, he's a Project Architect at GreenForm Studio, one of the country's most respected sustainable design practices.\n\nWe sat down with Reza to talk about the journey from graduation to practice, what skills he wishes he'd developed more at university, and what advice he has for current students.\n\n**What did you find most challenging about the transition from study to practice?**\n\nHonestly, the biggest shock was how much time is spent on coordination and documentation rather than design. In university, every hour is about the big ideas. In practice, you spend a lot of time ensuring that what you've designed can actually be built, coordinating with engineers, dealing with client feedback, and navigating approval processes. The students who thrived earliest were those who had developed real technical skills alongside their design sensibility.\n\n**What's one piece of advice you'd give current students?**\n\nLearn to communicate verbally. Not just through drawings and models, but through words. The ability to explain a design decision clearly and persuasively — to a client, to a council, to a contractor — is enormously valuable, and it's not something most graduates are comfortable with.`,
      category: "alumni-spotlight",
      author: "ARC Editorial Team",
      authorRole: "ARC Student Association",
      imageUrl: "/images/about-bg.png",
      readTime: 8,
    },
  ]);
  console.log("News seeded");

  // Team Members
  await db.insert(teamTable).values([
    {
      name: "Jamie Thornton",
      position: "President",
      year: "4th Year",
      bio: "Jamie is a passionate advocate for student welfare and cross-disciplinary collaboration. With experience in urban design studios and a focus on housing equity, they lead the association with vision and energy.",
      interests: "Urban design, housing policy, parametric facades",
      imageUrl: "https://api.dicebear.com/7.x/personas/svg?seed=jamie&backgroundColor=e8d5b0",
      email: "president@arc-assoc.edu",
      instagram: "@jamiethornton.arc",
      linkedin: "jamiethornton",
      order: 1,
    },
    {
      name: "Priya Nair",
      position: "Vice President",
      year: "3rd Year",
      bio: "Priya oversees the association's events portfolio and academic initiatives. A two-time national competition finalist, she brings creative leadership and meticulous organisation to everything she does.",
      interests: "Biophilic design, adaptive reuse, computational design",
      imageUrl: "https://api.dicebear.com/7.x/personas/svg?seed=priya&backgroundColor=c8b8a2",
      email: "vp@arc-assoc.edu",
      instagram: "@priya.nair.arch",
      linkedin: "priyanairarch",
      order: 2,
    },
    {
      name: "Marcus Williams",
      position: "Events Director",
      year: "3rd Year",
      bio: "Marcus is the logistical engine behind our events program. From intimate workshops to large-scale exhibitions, he ensures every event runs smoothly and reflects the best of our student community.",
      interests: "Exhibition design, sustainable materials, fabrication",
      imageUrl: "https://api.dicebear.com/7.x/personas/svg?seed=marcus&backgroundColor=d4c5b0",
      email: "events@arc-assoc.edu",
      instagram: "@marcus_builds",
      linkedin: "marcuswilliamsarch",
      order: 3,
    },
    {
      name: "Sarah Chen",
      position: "Gallery & Communications Director",
      year: "2nd Year",
      bio: "Sarah manages the association's visual identity, social media presence, and student gallery program. Her photography and graphic design work has won multiple university awards.",
      interests: "Architectural photography, heritage conservation, film",
      imageUrl: "https://api.dicebear.com/7.x/personas/svg?seed=sarah&backgroundColor=bfb0a0",
      email: "gallery@arc-assoc.edu",
      instagram: "@schen.studio",
      linkedin: "sarahchendesign",
      order: 4,
    },
  ]);
  console.log("Team seeded");

  // Gallery
  const galleryItems = [
    {
      title: "Coastal Community Centre",
      description: "Final year thesis project exploring liminal spaces between land and sea",
      imageUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
      category: "thesis",
      author: "Jamie Thornton",
      year: "2025",
    },
    {
      title: "Urban Housing Study",
      description: "Modular housing prototype for medium-density urban infill",
      imageUrl: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800&q=80",
      category: "studio-3rd",
      author: "Priya Nair",
      year: "2025",
    },
    {
      title: "Folded Plate Structure",
      description: "Physical model exploring structural origami for a community library",
      imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      category: "models",
      author: "Marcus Williams",
      year: "2024",
    },
    {
      title: "Heritage Market Adaptive Reuse",
      description: "Conversion of a disused railway station into a food and arts market",
      imageUrl: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
      category: "studio-3rd",
      author: "Sarah Chen",
      year: "2025",
    },
    {
      title: "Topographic Pavilion",
      description: "Competition entry for an outdoor event pavilion inspired by landscape contours",
      imageUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&q=80",
      category: "competitions",
      author: "Marcus Williams",
      year: "2025",
    },
    {
      title: "Light Studies",
      description: "Series of charcoal drawings exploring natural light through apertures",
      imageUrl: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800&q=80",
      category: "drawings",
      author: "Mia Kowalski",
      year: "2025",
    },
    {
      title: "First Year Housing Brief",
      description: "Exploration of domestic scale and spatial sequence",
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
      category: "studio-1st",
      author: "Tom Bradley",
      year: "2025",
    },
    {
      title: "Bamboo Pavilion Model",
      description: "1:20 scale model exploring sustainable structural systems",
      imageUrl: "https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=800&q=80",
      category: "models",
      author: "Priya Nair",
      year: "2024",
    },
    {
      title: "Urban Canopy Competition Entry",
      description: "First-place entry in National Student Architecture Competition 2026",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
      category: "competitions",
      author: "Sarah Chen & Marcus Williams",
      year: "2026",
    },
    {
      title: "Studio 2 Community Hub",
      description: "Neighbourhood community hub integrating indoor and outdoor space",
      imageUrl: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80",
      category: "studio-2nd",
      author: "Jordan Park",
      year: "2024",
    },
    {
      title: "Sectional Perspective Drawings",
      description: "Hand-drawn sectional perspectives of a multi-use cultural building",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      category: "drawings",
      author: "Mia Kowalski",
      year: "2025",
    },
    {
      title: "Thesis: Elevated Garden City",
      description: "Urban agriculture infrastructure as the framework for new urban density",
      imageUrl: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
      category: "thesis",
      author: "Reza Ahmadi",
      year: "2021",
    },
  ];
  await db.insert(galleryTable).values(galleryItems);
  console.log("Gallery seeded");

  // Resources
  await db.insert(resourcesTable).values([
    {
      title: "Architecture Drawing Standards Guide",
      description:
        "Comprehensive guide covering line weights, hatching, notation conventions, and drawing sheet layouts used in professional practice.",
      type: "guide",
      fileUrl: "#",
      software: null,
    },
    {
      title: "Rhino 3D for Architecture — Beginner to Intermediate",
      description:
        "Step-by-step video tutorial series covering NURBS surfaces, command line workflow, and output for fabrication. 8 hours of content.",
      type: "tutorial",
      fileUrl: "#",
      software: "Rhino 3D",
    },
    {
      title: "AutoCAD 2D Drafting Templates",
      description:
        "Pre-configured AutoCAD templates with standard layer sets, line weights, and title blocks for A1 and A3 presentation sheets.",
      type: "template",
      fileUrl: "#",
      software: "AutoCAD",
    },
    {
      title: "Revit for Architecture Students",
      description:
        "Introduction to BIM methodology and Revit workflows, including families, views, schedules, and documentation outputs.",
      type: "tutorial",
      fileUrl: "#",
      software: "Revit",
    },
    {
      title: "Portfolio Layout Toolkit",
      description:
        "Collection of InDesign templates for student portfolios, including single project spread layouts and full portfolio formats.",
      type: "template",
      fileUrl: "#",
      software: "Adobe InDesign",
    },
    {
      title: "Material & Detail Library",
      description:
        "Curated library of construction detail drawings in DWG format covering common wall, floor, and roof assemblies.",
      type: "guide",
      fileUrl: "#",
      software: null,
    },
  ]);
  console.log("Resources seeded");

  // Jobs
  await db.insert(jobsTable).values([
    {
      title: "Summer Architecture Internship",
      company: "Fitzroy & Partners",
      location: "Melbourne, VIC",
      type: "internship",
      description:
        "Join our award-winning practice for a 10-week summer internship. You'll work alongside experienced architects on residential and mixed-use projects across Victoria, gaining hands-on experience in design development, documentation, and client presentation.",
      requirements: "3rd year or above; proficiency in Rhino and AutoCAD; strong hand drawing skills",
      applicationUrl: "#",
      deadline: "2026-04-30",
    },
    {
      title: "Student Architectural Assistant — Part Time",
      company: "Studio Collective",
      location: "Sydney, NSW (Hybrid)",
      type: "part-time",
      description:
        "Studio Collective is a boutique practice specialising in sustainable residential design. We're looking for a talented architecture student to assist with concept development, 3D modelling, and preparing client presentations. 2 days per week.",
      requirements: "2nd year or above; Revit and SketchUp essential; interest in passive design",
      applicationUrl: "#",
      deadline: "2026-05-15",
    },
    {
      title: "Design Competition Coordinator (Volunteer)",
      company: "ARC National Student Chapter",
      location: "Remote",
      type: "volunteer",
      description:
        "Help coordinate this year's national student design competition, from brief development to organising the judging panel and exhibition. Great opportunity to develop project management skills and build your professional network.",
      requirements: "Open to all years; good communication and organisational skills",
      applicationUrl: "#",
      deadline: "2026-04-20",
    },
  ]);
  console.log("Jobs seeded");

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

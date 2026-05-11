import { db, resourcesTable } from "@workspace/db";
import { eq, count, and, isNotNull } from "drizzle-orm";

const SOFTWARE_TOOLS = [
  {
    title: "AutoCAD",
    description: "Industry-standard 2D/3D CAD software for drafting, detailing, and documentation. Free 1-year student licence via Autodesk Education.",
    type: "software",
    fileUrl: "https://www.autodesk.com/education/edu-software/overview",
    imageUrl: "https://logo.clearbit.com/autodesk.com",
    software: "AutoCAD",
    category: "digital-tools",
    tags: "CAD, 2D drafting, 3D modelling, Windows, Mac, student-free",
  },
  {
    title: "Revit",
    description: "Autodesk's BIM platform for architectural design, MEP, and structural engineering. Free student licence for 1 year.",
    type: "software",
    fileUrl: "https://www.autodesk.com/education/edu-software/overview",
    imageUrl: "https://logo.clearbit.com/autodesk.com",
    software: "Revit",
    category: "digital-tools",
    tags: "BIM, Revit, architectural design, MEP, Windows, student-free",
  },
  {
    title: "3ds Max",
    description: "Powerful 3D modelling and rendering software widely used for architectural visualisation. Available free for students via Autodesk Education.",
    type: "software",
    fileUrl: "https://www.autodesk.com/education/edu-software/overview",
    imageUrl: "https://logo.clearbit.com/autodesk.com",
    software: "3ds Max",
    category: "presentation",
    tags: "3D modelling, rendering, visualisation, Windows, student-free",
  },
  {
    title: "SketchUp Free",
    description: "Browser-based 3D modelling tool perfect for quick massing studies and conceptual design. Completely free, no install needed.",
    type: "software",
    fileUrl: "https://www.sketchup.com/plans-and-pricing/sketchup-free",
    imageUrl: "https://logo.clearbit.com/sketchup.com",
    software: "SketchUp Free",
    category: "design-methods",
    tags: "3D modelling, massing, conceptual design, Web, web-based, free, open-source",
  },
  {
    title: "Blender",
    description: "Free and open-source 3D creation suite covering modelling, sculpting, rendering and animation. Increasingly used for high-quality architectural visualisation.",
    type: "software",
    fileUrl: "https://www.blender.org/download/",
    imageUrl: "https://logo.clearbit.com/blender.org",
    software: "Blender",
    category: "presentation",
    tags: "3D modelling, rendering, animation, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "FreeCAD",
    description: "Open-source parametric 3D modeller suited to product and architectural design. Completely free on all platforms.",
    type: "software",
    fileUrl: "https://www.freecad.org/downloads.php",
    imageUrl: "https://logo.clearbit.com/freecad.org",
    software: "FreeCAD",
    category: "digital-tools",
    tags: "parametric modelling, 3D, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "LibreCAD",
    description: "Free open-source 2D CAD application — a solid AutoCAD alternative for technical drawing and floor plans.",
    type: "software",
    fileUrl: "https://librecad.org/",
    imageUrl: "https://logo.clearbit.com/librecad.org",
    software: "LibreCAD",
    category: "digital-tools",
    tags: "CAD, 2D drafting, floor plans, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "Sweet Home 3D",
    description: "Free interior design application that lets you draw a home plan and arrange furniture with a 3D preview.",
    type: "software",
    fileUrl: "https://www.sweethome3d.com/download.jsp",
    imageUrl: "https://logo.clearbit.com/sweethome3d.com",
    software: "Sweet Home 3D",
    category: "interior",
    tags: "interior design, floor plans, 3D preview, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "GIMP",
    description: "Free and open-source raster graphics editor for image editing, texture creation, and post-production of renders.",
    type: "software",
    fileUrl: "https://www.gimp.org/downloads/",
    imageUrl: "https://logo.clearbit.com/gimp.org",
    software: "GIMP",
    category: "presentation",
    tags: "image editing, texture, post-production, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "Inkscape",
    description: "Free open-source vector graphics editor — ideal for diagrams, presentation layouts, and site-plan graphics.",
    type: "software",
    fileUrl: "https://inkscape.org/release/",
    imageUrl: "https://logo.clearbit.com/inkscape.org",
    software: "Inkscape",
    category: "presentation",
    tags: "vector graphics, diagrams, layouts, Windows, Mac, Linux, free, open-source",
  },
  {
    title: "Lumion Student",
    description: "Real-time 3D rendering and visualisation software. Free student edition available with a verified .edu email.",
    type: "software",
    fileUrl: "https://lumion.com/product/free-student-license.html",
    imageUrl: "https://logo.clearbit.com/lumion.com",
    software: "Lumion",
    category: "presentation",
    tags: "rendering, visualisation, real-time, Windows, student-free",
  },
  {
    title: "Rhino 3D",
    description: "Powerful NURBS-based 3D modelling software used in architecture, industrial design, and fabrication. Student pricing available.",
    type: "software",
    fileUrl: "https://www.rhino3d.com/edu/",
    imageUrl: "https://logo.clearbit.com/rhino3d.com",
    software: "Rhino 3D",
    category: "design-methods",
    tags: "NURBS, 3D modelling, fabrication, parametric, Windows, Mac, student-discount",
  },
  {
    title: "ArchiCAD Student",
    description: "BIM software for architects with full professional features. Free for students with academic verification.",
    type: "software",
    fileUrl: "https://graphisoft.com/solutions/archicad/free-archicad/",
    imageUrl: "https://logo.clearbit.com/graphisoft.com",
    software: "ArchiCAD",
    category: "digital-tools",
    tags: "BIM, architectural design, documentation, Windows, Mac, student-free",
  },
  {
    title: "Adobe Creative Cloud Student",
    description: "Includes Photoshop, Illustrator, InDesign, and Premiere — essential for presentation boards, portfolios, and visualisation. Significant student discount.",
    type: "software",
    fileUrl: "https://www.adobe.com/creativecloud/buy/students.html",
    imageUrl: "https://logo.clearbit.com/adobe.com",
    software: "Adobe Creative Cloud",
    category: "presentation",
    tags: "Photoshop, Illustrator, InDesign, presentation, portfolio, Windows, Mac, student-discount",
  },
];

export async function seedSoftwareTools() {
  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(resourcesTable)
      .where(eq(resourcesTable.type, "software"));

    const [{ withImages }] = await db
      .select({ withImages: count() })
      .from(resourcesTable)
      .where(and(eq(resourcesTable.type, "software"), isNotNull(resourcesTable.imageUrl)));

    if (Number(total) >= SOFTWARE_TOOLS.length && Number(withImages) >= SOFTWARE_TOOLS.length) {
      console.log(`[seed-software] ${total} software tools with logos already present — skipping`);
      return;
    }

    console.log(`[seed-software] Re-seeding software tools (${total} existing, ${withImages} with logos)…`);

    await db.delete(resourcesTable).where(eq(resourcesTable.type, "software"));

    for (const tool of SOFTWARE_TOOLS) {
      await db.insert(resourcesTable).values(tool);
    }

    console.log(`[seed-software] Done — inserted ${SOFTWARE_TOOLS.length} software tools with logos`);
  } catch (err) {
    console.error("[seed-software] Error seeding software tools:", err);
  }
}

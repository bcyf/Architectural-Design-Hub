import { PageWrapper } from "@/components/layout/PageWrapper";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useListNews } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";

const MOCK_NEWS = [
  { id: 1, title: "The Rise of Mass Timber in Urban Centers", excerpt: "Exploring how new structural timber technologies are reshaping our skylines.", category: "Tech Tips", author: "Jane Doe", publishedAt: new Date().toISOString(), readTime: 5, imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80" },
  { id: 2, title: "Studio Culture: Finding Balance", excerpt: "A critical look at the demanding hours of architecture school and ways to maintain mental health.", category: "Opinion", author: "John Smith", publishedAt: new Date(Date.now() - 86400000).toISOString(), readTime: 4, imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80" },
];

export default function Blog() {
  const { data: newsData, isLoading } = useListNews();
  const news = newsData?.length ? newsData : MOCK_NEWS;

  return (
    <PageWrapper>
      <div className="bg-secondary py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">The Drafting Board.</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Thoughts, reviews, and insights from the ARC student community.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-16">
            {isLoading ? (
              [1, 2].map(i => <div key={i} className="h-64 bg-muted animate-pulse" />)
            ) : (
              news?.map((post: any) => (
                <article key={post.id} className="group border-b border-border pb-16 last:border-0">
                  {post.imageUrl && (
                    <div className="aspect-[21/9] overflow-hidden mb-8">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm font-medium uppercase tracking-widest text-muted-foreground mb-4">
                    <span className="text-primary">{post.category}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span>{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span>{post.readTime} Min Read</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 group-hover:text-primary transition-colors cursor-pointer">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">By {post.author}</div>
                    <span className="text-primary font-medium hover:underline cursor-pointer">Read Full Article →</span>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-12">
            <div className="p-8 border border-border bg-card">
              <h3 className="font-display font-bold text-xl mb-4">Write for Us</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Have an opinion on a recent lecture? Want to share a Rhino tip? We're always looking for student contributors.
              </p>
              <Link href="/contact" className="text-primary font-medium hover:underline">
                Pitch an Article
              </Link>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl mb-4 border-b border-border pb-2">Categories</h3>
              <ul className="space-y-3">
                {["Reviews", "Opinion", "Alumni Spotlight", "Tech Tips", "News"].map(cat => (
                  <li key={cat}>
                    <button className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex justify-between w-full">
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </PageWrapper>
  );
}

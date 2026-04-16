import { useParams, Link } from "wouter";
import { useGetNewsPost } from "@workspace/api-client-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { format } from "date-fns";
import { ArrowLeft, Clock, User } from "lucide-react";

const CATEGORIES = ["Reviews", "Opinion", "Alumni Spotlight", "Tech Tips", "News"];

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, isError } = useGetNewsPost(Number(id));

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-12 w-3/4 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="aspect-[21/9] bg-muted rounded" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-muted rounded" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError || !post) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-8">This article may have been removed or doesn't exist.</p>
          <Link href="/blog" className="text-primary hover:underline font-medium">← Back to Blog</Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10">
          <ArrowLeft size={16} />
          Back to Blog
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
          <span className="text-primary">{post.category}</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <span>{format(new Date(post.publishedAt), "MMMM d, yyyy")}</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight mb-6">
          {post.title}
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10 pb-10 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
            {post.author.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{post.author}</p>
            {post.authorRole && <p className="text-xs text-muted-foreground">{post.authorRole}</p>}
          </div>
        </div>

        {/* Cover image */}
        {post.imageUrl && (
          <div className="aspect-[21/9] overflow-hidden mb-10">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Excerpt (lead) */}
        <p className="text-xl text-muted-foreground leading-relaxed mb-8 font-medium border-l-4 border-primary pl-5">
          {post.excerpt}
        </p>

        {/* Full content */}
        <div className="prose prose-neutral max-w-none text-foreground leading-relaxed space-y-5">
          {post.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-base leading-8 text-foreground/90">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User size={14} />
            <span>Written by <strong className="text-foreground">{post.author}</strong>{post.authorRole ? `, ${post.authorRole}` : ""}</span>
          </div>
          <Link href="/blog" className="text-primary font-medium hover:underline text-sm">
            ← More articles
          </Link>
        </div>

      </article>
    </PageWrapper>
  );
}

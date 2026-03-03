import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  RefreshCw, 
  Plus, 
  X, 
  MessageSquare, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Edit2,
  Send,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useNicheProfiles, 
  useCreateNiche, 
  useDeleteNiche,
  useTrendingPosts,
  useDiscoverTrending,
  useGenerateComments,
  useUpdateComment,
  usePostComment,
  useDeleteTrendingPost,
  useBehaviorLimits,
  useUpdateBehaviorLimit,
  useTwitterStatus
} from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function TrendScanner() {
  const { toast } = useToast();
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [showAddNiche, setShowAddNiche] = useState(false);
  const [newNicheName, setNewNicheName] = useState("");
  const [newNicheKeywords, setNewNicheKeywords] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});

  const { data: niches = [], isLoading: isLoadingNiches } = useNicheProfiles();
  const { data: posts = [], isLoading: isLoadingPosts, refetch: refetchPosts } = useTrendingPosts(selectedNicheId || undefined);
  const { data: behaviorLimits = [] } = useBehaviorLimits();
  const { data: twitterStatus } = useTwitterStatus();
  const isLive = twitterStatus?.connected === true;

  const createNicheMutation = useCreateNiche();
  const deleteNicheMutation = useDeleteNiche();
  const discoverMutation = useDiscoverTrending();
  const generateCommentsMutation = useGenerateComments();
  const updateCommentMutation = useUpdateComment();
  const postCommentMutation = usePostComment();
  const deletePostMutation = useDeleteTrendingPost();
  const updateLimitMutation = useUpdateBehaviorLimit();

  const handleAddNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNicheName || !newNicheKeywords) return;
    await createNicheMutation.mutateAsync({ name: newNicheName, keywords: newNicheKeywords });
    setNewNicheName("");
    setNewNicheKeywords("");
    setShowAddNiche(false);
    toast({ title: "Niche added", description: `${newNicheName} profile created.` });
  };

  const handleDiscover = async () => {
    if (!selectedNicheId) {
      toast({ title: "Select a niche", description: "Please select a niche to discover posts for.", variant: "destructive" });
      return;
    }
    await discoverMutation.mutateAsync(selectedNicheId);
    toast({ title: "Discovery started", description: "Scanning for trending posts..." });
  };

  const handleGenerateComments = async (postId: number) => {
    await generateCommentsMutation.mutateAsync(postId);
    setExpandedPosts(prev => ({ ...prev, [postId]: true }));
    toast({ title: "Comments generated", description: "AI suggested replies are ready for review." });
  };

  const handleUpdateCommentStatus = async (commentId: number, status: string) => {
    await updateCommentMutation.mutateAsync({ id: commentId, status });
  };

  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditedCommentText(comment.commentText);
  };

  const handleSaveEditedComment = async (commentId: number) => {
    await updateCommentMutation.mutateAsync({ id: commentId, commentText: editedCommentText });
    setEditingCommentId(null);
  };

  const handlePostComment = async (commentId: number) => {
    if (!confirm("Post this comment to Twitter?")) return;
    await postCommentMutation.mutateAsync(commentId);
    toast({ title: "Comment posted", description: "Successfully published to X." });
  };

  const getLimitValue = (key: string, defaultValue: string) => {
    return behaviorLimits.find(l => l.key === key)?.value || defaultValue;
  };

  const updateLimit = (key: string, value: string) => {
    updateLimitMutation.mutate({ key, value });
  };

  const togglePostExpansion = (postId: number) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0));
  }, [posts]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-page-title">Trending Opportunities</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">Discover rising conversations and engage with AI assistance.</p>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isLive 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
          }`} data-testid="badge-connection-mode">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
            {isLive ? (
              <span>Live Mode — {twitterStatus?.handle} connected</span>
            ) : (
              <span>Demo Mode — <a href="/settings" className="underline hover:text-amber-300">connect Twitter in Settings</a> to go live</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-primary/50 text-primary hover:bg-primary/10"
            onClick={() => refetchPosts()}
            data-testid="button-refresh-trends"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Feed
          </Button>
          <Button
            className="bg-primary text-white"
            onClick={() => setShowAddNiche(!showAddNiche)}
            data-testid="button-toggle-add-niche"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Niche
          </Button>
        </div>
      </div>

      {/* Niche Manager */}
      <section className="space-y-4">
        <AnimatePresence>
          {showAddNiche && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="p-4 glass-panel border-primary/20">
                <form onSubmit={handleAddNiche} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Niche Name</label>
                    <Input 
                      placeholder="e.g. AI SaaS, Fitness Tech..." 
                      value={newNicheName} 
                      onChange={e => setNewNicheName(e.target.value)} 
                      data-testid="input-niche-name"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="flex-[2] space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keywords (comma separated)</label>
                    <Input 
                      placeholder="e.g. startup, artificial intelligence, founders..." 
                      value={newNicheKeywords} 
                      onChange={e => setNewNicheKeywords(e.target.value)} 
                      data-testid="input-niche-keywords"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-primary text-white" disabled={createNicheMutation.isPending} data-testid="button-submit-niche">
                      {createNicheMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Profile"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddNiche(false)} data-testid="button-cancel-niche">Cancel</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={selectedNicheId === null ? "default" : "outline"}
            className={`cursor-pointer px-4 py-1.5 text-sm transition-all ${selectedNicheId === null ? 'bg-primary text-primary-foreground' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedNicheId(null)}
            data-testid="badge-niche-all"
          >
            All Niches
          </Badge>
          {niches.map(niche => (
            <div key={niche.id} className="relative group">
              <Badge
                variant={selectedNicheId === niche.id ? "default" : "outline"}
                className={`cursor-pointer px-4 py-1.5 text-sm transition-all pr-8 ${selectedNicheId === niche.id ? 'bg-primary text-primary-foreground' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedNicheId(niche.id)}
                data-testid={`badge-niche-${niche.id}`}
              >
                {niche.name}
              </Badge>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNicheMutation.mutate(niche.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                data-testid={`button-delete-niche-${niche.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-secondary/10 p-4 rounded-xl border border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="text-primary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Discovery Engine</h3>
                <p className="text-xs text-muted-foreground">Scan selected niche for new opportunities</p>
              </div>
            </div>
            <Button 
              disabled={!selectedNicheId || discoverMutation.isPending}
              onClick={handleDiscover}
              className="bg-primary hover:bg-primary/90 text-white"
              data-testid="button-discover-posts"
            >
              {discoverMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isLive ? "Search Twitter" : "Simulate Posts"}
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {isLoadingPosts ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)
            ) : sortedPosts.length === 0 ? (
              <Card className="p-12 text-center border-dashed flex flex-col items-center gap-4">
                <MessageSquare className="w-12 h-12 text-muted-foreground opacity-20" />
                <div className="space-y-1">
                  <p className="text-lg font-medium">No posts found</p>
                  <p className="text-sm text-muted-foreground">Select a niche and click "Discover Posts" to find opportunities.</p>
                </div>
              </Card>
            ) : (
              sortedPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden glass-panel border-border/40 hover:border-primary/20 transition-all" data-testid={`card-trending-post-${post.id}`}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                          {post.authorHandle.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground" data-testid={`text-post-author-${post.id}`}>@{post.authorHandle}</span>
                            <Badge variant="outline" className="text-[10px] bg-background/50" data-testid={`text-post-followers-${post.id}`}>
                              {post.authorFollowers.toLocaleString()} followers
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{post.discoveredAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${
                            post.status === 'viral' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                            post.status === 'trending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                            'bg-green-500/20 text-green-400 border-green-500/30'
                          }`}
                          data-testid={`badge-post-status-${post.id}`}
                        >
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Badge>
                        <button 
                          onClick={() => deletePostMutation.mutate(post.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-lg leading-relaxed mb-4" data-testid={`text-post-content-${post.id}`}>
                      {post.postText}
                    </p>

                    {post.postImageUrl && (
                      <div className="relative mb-4 rounded-xl overflow-hidden border border-border/20 group" data-testid={`img-post-image-${post.id}`}>
                        <img 
                          src={post.postImageUrl} 
                          alt="Post attachment"
                          className="w-full max-h-[300px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-purple-400" />
                          <span className="text-[10px] text-purple-300 font-medium">AI Vision</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/10">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-post-replies-${post.id}`}>
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{post.replies}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-post-retweets-${post.id}`}>
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-sm">{post.retweets}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground" data-testid={`text-post-likes-${post.id}`}>
                          <Activity className="w-4 h-4" />
                          <span className="text-sm">{post.likes}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-1 max-w-[200px]">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold">
                            <span className="text-muted-foreground">Trend Score</span>
                            <span className={post.trendScore > 80 ? 'text-red-400' : post.trendScore > 50 ? 'text-yellow-400' : 'text-green-400'}>
                              {post.trendScore}%
                            </span>
                          </div>
                          <Progress 
                            value={post.trendScore} 
                            className={`h-1.5 bg-background ${
                              post.trendScore > 80 ? '[&>div]:bg-red-500' : 
                              post.trendScore > 50 ? '[&>div]:bg-yellow-500' : 
                              '[&>div]:bg-green-500'
                            }`}
                            data-testid={`progress-trend-score-${post.id}`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <a href={post.postUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-post-url-${post.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20"
                          onClick={() => handleGenerateComments(post.id)}
                          disabled={generateCommentsMutation.isPending}
                          data-testid={`button-generate-comments-${post.id}`}
                        >
                          {generateCommentsMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Generate Comments
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comment Suggestions Section */}
                  <AnimatePresence>
                    {(post.comments && post.comments.length > 0) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        className="bg-secondary/5 border-t border-border/40"
                      >
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                              <MessageSquare className="w-3 h-3" />
                              AI SUGGESTED REPLIES
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px]"
                              onClick={() => togglePostExpansion(post.id)}
                            >
                              {expandedPosts[post.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {expandedPosts[post.id] ? "Collapse" : "Show All"}
                            </Button>
                          </div>

                          <div className={`space-y-3 ${expandedPosts[post.id] ? '' : 'max-h-[160px] overflow-hidden'}`}>
                            {post.comments.map((comment) => (
                              <motion.div 
                                key={comment.id}
                                className={`p-4 rounded-lg border transition-all ${
                                  comment.status === 'posted' ? 'bg-green-500/5 border-green-500/20' : 
                                  comment.status === 'approved' ? 'bg-primary/5 border-primary/20' : 
                                  comment.status === 'rejected' ? 'opacity-50 bg-secondary/10 border-border/20' : 
                                  'bg-background/40 border-border/40'
                                }`}
                                data-testid={`card-comment-${comment.id}`}
                              >
                                {editingCommentId === comment.id ? (
                                  <div className="space-y-3">
                                    <Textarea 
                                      value={editedCommentText} 
                                      onChange={e => setEditedCommentText(e.target.value)}
                                      className="bg-background border-primary/30 min-h-[80px]"
                                      data-testid={`input-edit-comment-${comment.id}`}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                      <Button size="sm" className="bg-primary text-white" onClick={() => handleSaveEditedComment(comment.id)}>Save Changes</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                      <p className="text-sm flex-1" data-testid={`text-comment-content-${comment.id}`}>{comment.commentText}</p>
                                      <div className="flex flex-col items-end gap-1.5">
                                        <Badge variant="secondary" className="text-[10px] capitalize" data-testid={`badge-comment-type-${comment.id}`}>
                                          {comment.commentType}
                                        </Badge>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-[10px] uppercase tracking-tighter ${
                                            comment.riskLevel === 'high' ? 'text-red-400 border-red-500/20' : 
                                            comment.riskLevel === 'medium' ? 'text-yellow-400 border-yellow-500/20' : 
                                            'text-green-400 border-green-500/20'
                                          }`}
                                          data-testid={`badge-comment-risk-${comment.id}`}
                                        >
                                          {comment.riskLevel} risk
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/10">
                                      <div className="flex gap-2">
                                        {comment.status === 'posted' ? (
                                          <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Posted on Twitter
                                          </div>
                                        ) : (
                                          <>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className={`h-8 ${comment.status === 'approved' ? 'text-green-400 bg-green-500/10' : 'text-muted-foreground hover:text-green-400 hover:bg-green-500/10'}`}
                                              onClick={() => handleUpdateCommentStatus(comment.id, 'approved')}
                                              data-testid={`button-approve-comment-${comment.id}`}
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                              Approve
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                              onClick={() => handleEditComment(comment)}
                                              data-testid={`button-edit-comment-${comment.id}`}
                                            >
                                              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                              Edit
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className={`h-8 ${comment.status === 'rejected' ? 'text-red-400 bg-red-500/10' : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10'}`}
                                              onClick={() => handleUpdateCommentStatus(comment.id, 'rejected')}
                                              data-testid={`button-reject-comment-${comment.id}`}
                                            >
                                              <X className="w-3.5 h-3.5 mr-1.5" />
                                              Reject
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                      
                                      {comment.status === 'approved' && (
                                        <div className="flex items-center gap-2">
                                          <Button 
                                            size="sm" 
                                            className="h-8 bg-primary text-white"
                                            onClick={() => handlePostComment(comment.id)}
                                            data-testid={`button-post-comment-${comment.id}`}
                                          >
                                            <Send className="w-3.5 h-3.5 mr-1.5" />
                                            {isLive ? "Post to Twitter" : "Post (Demo)"}
                                          </Button>
                                          {!isLive && (
                                            <span className="text-[10px] text-amber-400/70">Simulated — connect Twitter to post for real</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <Card className="p-6 glass-panel border-border/40 sticky top-6">
            <h3 className="text-lg font-display font-semibold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-primary w-5 h-5" />
              Safety Settings
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Daily Comment Cap</label>
                  <span className="text-xs font-mono text-primary">{getLimitValue('daily_cap', '15')}</span>
                </div>
                <Input 
                  type="number" 
                  value={getLimitValue('daily_cap', '15')} 
                  onChange={e => updateLimit('daily_cap', e.target.value)}
                  className="bg-background/50 h-8"
                  data-testid="input-daily-cap"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Hourly Limit</label>
                  <span className="text-xs font-mono text-primary">{getLimitValue('hourly_limit', '3')}</span>
                </div>
                <Input 
                  type="number" 
                  value={getLimitValue('hourly_limit', '3')} 
                  onChange={e => updateLimit('hourly_limit', e.target.value)}
                  className="bg-background/50 h-8"
                  data-testid="input-hourly-limit"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Cooldown (min)</label>
                  <span className="text-xs font-mono text-primary">{getLimitValue('cooldown_minutes', '10')}</span>
                </div>
                <Input 
                  type="number" 
                  value={getLimitValue('cooldown_minutes', '10')} 
                  onChange={e => updateLimit('cooldown_minutes', e.target.value)}
                  className="bg-background/50 h-8"
                  data-testid="input-cooldown"
                />
              </div>

              <div className="pt-4 border-t border-border/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Safe Mode</label>
                    <p className="text-[10px] text-muted-foreground">Only post low-risk comments</p>
                  </div>
                  <Switch 
                    checked={getLimitValue('safe_mode', 'true') === 'true'} 
                    onCheckedChange={checked => updateLimit('safe_mode', String(checked))}
                    data-testid="switch-safe-mode"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Human Variance</label>
                    <p className="text-[10px] text-muted-foreground">Randomize post timing</p>
                  </div>
                  <Switch 
                    checked={getLimitValue('human_variance', 'true') === 'true'} 
                    onCheckedChange={checked => updateLimit('human_variance', String(checked))}
                    data-testid="switch-human-variance"
                  />
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3 mt-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  Avoid excessive automation. We recommend keeping daily limits below 25 comments per account to prevent flag triggers.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass-panel border-border/40 bg-primary/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Recent Activity
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                <p className="text-muted-foreground"><span className="text-foreground font-medium">Comment posted</span> to @techcrunch post • 12m ago</p>
              </div>
              <div className="flex items-start gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
                <p className="text-muted-foreground"><span className="text-foreground font-medium">5 new posts</span> discovered in AI SaaS niche • 1h ago</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

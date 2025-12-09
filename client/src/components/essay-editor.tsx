import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Essay } from "@shared/schema";
import { Save, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next"; 

interface EssayEditorProps {
  essayId?: string;
  onEssayChange?: (essay: Essay) => void;
}

export function EssayEditor({ essayId, onEssayChange }: EssayEditorProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: essay } = useQuery({
    queryKey: [`/api/essays/${essayId}`],
    enabled: !!essayId,
  });

  useEffect(() => {
    if (essay && typeof essay === 'object' && 'title' in essay && 'content' in essay) {
      setTitle(essay.title as string);
      setContent(essay.content as string);
      onEssayChange?.(essay as Essay);
    }
  }, [essay, onEssayChange]);

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  const { data: userProfile } = useQuery({
    queryKey: [`/api/profile/${user?.id}`],
    enabled: !!user?.id,
  });

  const saveEssayMutation = useMutation({
    mutationFn: async () => {
      const essayData = {
        title: title || "Untitled Essay",
        content,
        isPublic: false,
      };

      if (essayId) {
        return apiRequest("PUT", `/api/essays/${essayId}`, essayData);
      } else {
        return apiRequest("POST", "/api/essays", essayData);
      }
    },
    onSuccess: async (response) => {
      const savedEssay = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      onEssayChange?.(savedEssay);
      toast({
        title: t('editor.toast.saved_title'),
        description: t('editor.toast.saved_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('editor.toast.save_failed_title'),
        description: t('editor.toast.save_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const analyzeEssayMutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      return apiRequest("POST", `/api/essays/${data.id}/analyze`);
    },
    onSuccess: async (response, variables) => {
      const aiReview = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}/peer-reviews`] });
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      queryClient.invalidateQueries({ queryKey: [`/api/essays?authorId=${user?.id}`] });
      
      toast({
        title: t('editor.toast.analysis_complete'),
        description: t('editor.toast.analysis_desc', { count: aiReview.corrections?.length || 0 }),
      });

      setTimeout(() => {
        setLocation(`/essay/${variables.id}`);
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: t('editor.toast.analysis_failed'),
        description: error.message || t('editor.toast.analysis_failed_default'),
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: t('editor.toast.content_req_title'),
        description: t('editor.toast.content_req_desc'),
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      let currentEssayId = essayId;
      if (!currentEssayId) {
        const saveResponse = await apiRequest("POST", "/api/essays", {
          title: title || t('editor.untitled'),
          content,
          isPublic: false,
        });
        const savedEssay = await saveResponse.json();
        currentEssayId = savedEssay.id;
        onEssayChange?.(savedEssay);
      }

      await analyzeEssayMutation.mutateAsync({ id: currentEssayId! });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">{t('editor.header')}</h2>
          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
            {t('editor.words', { count: wordCount })}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveEssayMutation.mutate()}
            disabled={saveEssayMutation.isPending}
            data-testid="button-save"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !content.trim()}
            data-testid="button-analyze"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isAnalyzing ? t('editor.analyzing') : t('editor.analyze')}
          </Button>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="mb-4">
          <Input
            type="text"
            placeholder={t('editor.placeholders.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none shadow-none text-foreground placeholder-muted-foreground px-0"
            data-testid="input-title"
          />
        </div>
        
        <Textarea
          placeholder={t('editor.placeholders.content')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[400px] text-base leading-relaxed bg-transparent border-none shadow-none resize-none px-0"
          data-testid="textarea-content"
        />
      </CardContent>
    </Card>
  );
}

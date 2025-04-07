
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';

interface LinkFormProps {
  onConvertLink: (url: string) => Promise<void>;
  isLoading: boolean;
}

const LinkForm: React.FC<LinkFormProps> = ({ onConvertLink, isLoading }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    try {
      await onConvertLink(linkUrl);
    } catch (error) {
      console.error("Error converting link:", error);
      toast({
        title: "Error",
        description: "Failed to convert the link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-3xl">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            type="url"
            placeholder="Paste any link here..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !linkUrl.trim()} 
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Converting
            </>
          ) : (
            "Convert"
          )}
        </Button>
      </div>
    </form>
  );
};

export default LinkForm;

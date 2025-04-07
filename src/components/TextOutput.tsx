
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clipboard, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { cn } from '@/lib/utils';

interface TextOutputProps {
  text: string;
  title: string;
  isLoading: boolean;
}

const TextOutput: React.FC<TextOutputProps> = ({ text, title, isLoading }) => {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<number | null>(null);

  const copyToClipboard = () => {
    if (!text) return;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Text copied to clipboard",
        });
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        
        // Reset copied state after 2 seconds
        timeoutRef.current = window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast({
          title: "Error",
          description: "Failed to copy text to clipboard",
          variant: "destructive",
        });
      });
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-3xl">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-medium">
          {title || "Converted Text"}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          disabled={!text || isLoading}
          className={cn(
            "transition-all",
            copied ? "bg-green-50 text-green-600" : ""
          )}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full rounded-b-md">
          {text ? (
            <div className="p-4 whitespace-pre-wrap">{text}</div>
          ) : (
            <div className="p-4 text-muted-foreground italic text-center h-full flex items-center justify-center">
              {isLoading 
                ? "Converting your link to text..." 
                : "Converted text will appear here"}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TextOutput;

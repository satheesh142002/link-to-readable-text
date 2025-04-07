
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import LinkForm from '../components/LinkForm';
import TextOutput from '../components/TextOutput';
import { convertLinkToText } from '../services/linkConverter';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Link as LinkIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [convertedText, setConvertedText] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConvertLink = async (url: string) => {
    console.log(`Starting conversion for URL: ${url}`);
    setIsLoading(true);
    setConvertedText(''); // Clear previous results
    
    try {
      const { text, title } = await convertLinkToText(url);
      console.log("Conversion successful:", { textLength: text.length, title });
      
      setConvertedText(text);
      setTitle(title);
      
      toast({
        title: "Conversion complete",
        description: "Your link has been successfully converted to text.",
      });
    } catch (error) {
      console.error('Error converting link:', error);
      setConvertedText('Error: Could not convert the link. Please try a different link or try again later.');
      setTitle('Error');
      
      toast({
        title: "Conversion failed",
        description: "We couldn't convert this link. Please try a different URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Link to</span>
              <span className="block text-primary">Readable Text</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Convert any type of link into clean, readable text in seconds.
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-8">
            <LinkForm onConvertLink={handleConvertLink} isLoading={isLoading} />
            
            <TextOutput 
              text={convertedText} 
              title={title} 
              isLoading={isLoading} 
            />
            
            <Separator className="my-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              <FeatureCard 
                icon={<LinkIcon className="h-8 w-8 text-primary" />}
                title="Any Link Type"
                description="Works with article links, blogs, documentation, and more."
              />
              <FeatureCard 
                icon={<FileText className="h-8 w-8 text-primary" />}
                title="Clean Formatting"
                description="Get properly formatted text that's easy to read and use."
              />
              <FeatureCard 
                icon={<ExternalLink className="h-8 w-8 text-primary" />}
                title="Easy Sharing"
                description="One-click copy to share content with others."
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} LinkToText Converter
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center p-6">
        <div className="mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

export default Index;

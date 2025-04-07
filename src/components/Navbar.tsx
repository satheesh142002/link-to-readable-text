
import React from 'react';
import { Link } from 'react-router-dom';
import { TextQuote } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <TextQuote className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-semibold">LinkToText</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

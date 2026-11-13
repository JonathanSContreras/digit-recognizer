import type { Metadata } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const orbitron = Orbitron({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-orbitron' });

export const metadata: Metadata = {
  title: 'Digit Recognizer',
  description: 'Draw a digit and a CNN trained on MNIST recognizes it, running entirely in your browser with TensorFlow.js.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable}`}>
      <body className="bg-primary font-sans text-white antialiased">{children}</body>
    </html>
  );
}

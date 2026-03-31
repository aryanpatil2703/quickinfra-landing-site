import { Plus_Jakarta_Sans } from "next/font/google";
import ThemeProvider from "./components/ThemeProvider";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import QuickInfraChatbot from "@/app/components/chatbot/QuickInfraChatbot";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "QuickInfra — DevOps & InfraOps on Autopilot",
  description:
    "Automate your entire infrastructure layer — provisioning, CI/CD, compliance, and cost optimisation. Production-ready cloud in under an hour.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning
        className={`${jakarta.variable} font-sans antialiased
          bg-white dark:bg-slate-950
          text-slate-900 dark:text-white
          transition-colors duration-300`}
      >
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <QuickInfraChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ClaudeChatInterface from "@/pages/claude-chat";
import LeadsDatabasePage from "@/pages/leads-database";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ClaudeChatInterface} />
      <Route path="/chat" component={ClaudeChatInterface} />
      <Route path="/database" component={LeadsDatabasePage} />
      <Route component={ClaudeChatInterface} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

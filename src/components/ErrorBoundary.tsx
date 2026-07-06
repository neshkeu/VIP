import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <h1 className="text-lg font-semibold text-destructive">Nešto je pošlo po zlu</h1>
            <p className="text-sm text-muted-foreground break-words">
              {this.state.error.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Osveži stranicu
              </button>
              <button
                onClick={this.reset}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

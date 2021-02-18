import * as React from "react";
import { ContainerContext } from "../XUIProvider";
import { ContainerInstance } from "@kaviar/core";
import { useUIComponents } from "../hooks/useUIComponents";

export type ErrorBoundaryProps = {
  children: React.ReactNode;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  {
    hasError: boolean;
  },
  ContainerInstance
> {
  context: ContainerInstance;
  currentError: Error;
  currentErrorInfo: React.ErrorInfo;

  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.currentError = error;
    this.currentErrorInfo = errorInfo;
    // You can also log the error to an error reporting service
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      const UIComponents = useUIComponents();
      // You can render any custom fallback UI
      return (
        <UIComponents.Error
          error={this.currentError}
          errorInfo={this.currentErrorInfo}
        />
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.contextType = ContainerContext;

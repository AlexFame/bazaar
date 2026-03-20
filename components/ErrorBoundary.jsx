"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";
import { useLang } from "@/lib/i18n-client";

class ErrorBoundaryBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-bold mb-2">{t("error_boundary_title") || "Что-то пошло не так"}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t("error_boundary_desc") || "Мы уже получили уведомление об ошибке и работаем над её исправлением."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {t("error_boundary_reload") || "Перезагрузить страницу"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props) {
  const { t } = useLang();
  return <ErrorBoundaryBase t={t} {...props} />;
}

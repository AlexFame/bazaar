"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  const triggerError = () => {
    throw new Error("🧪 Sentry test error - это тестовая ошибка!");
  };

  const captureMessage = () => {
    Sentry.captureMessage("Test message from Bazaar", "info");
    alert("Тестовое сообщение отправлено в Sentry!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Sentry Test</h1>
        
        <div className="space-y-3">
          <button
            onClick={captureMessage}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
          >
            📨 Отправить тестовое сообщение
          </button>

          <button
            onClick={triggerError}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors"
          >
            💥 Вызвать тестовую ошибку
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
          <p className="font-semibold mb-2">Инструкция:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Нажмите "Отправить тестовое сообщение"</li>
            <li>Или нажмите "Вызвать тестовую ошибку"</li>
            <li>Проверьте Sentry Dashboard</li>
            <li>Ошибка должна появиться в течение нескольких секунд</li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <a 
            href="https://sentry.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Открыть Sentry Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}

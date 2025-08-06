// app/not-found.tsx

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center text-center p-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">404 – Page Not Found</h1>
        <p className="text-lg mb-6">Sorry, we couldn't find the page you're looking for.</p>
        <a href="/" className="text-blue-500 underline">Go back home</a>
      </div>
    </div>
  );
}

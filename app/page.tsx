"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import GoogleButton from "react-google-button";

interface PhoneNumber {
  value: string;
  type?: string;
}

export default function Component() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  console.log(session?.user);
  console.log(session?.accessToken);
  if (session) {
    return (
      <div className="p-6 max-w-md mx-auto  rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">User Profile</h2>

        <div className="mb-4">
          <img
            src={
              session.user?.image ??
              "/user-circle-isolated-icon-round-600nw-2459622791.jpg.webp"
            }
            alt="Profile"
            className="w-20 h-20 rounded-full mx-auto"
          />
        </div>

        <div className="space-y-2">
          <div>
            <strong>Google ID:</strong>{" "}
            {session.user?.googleId || "Not available"}
          </div>

          <div>
            <strong>Full Name:</strong> {session.user?.name || "Not available"}
          </div>

          <div>
            <strong>Email:</strong> {session.user?.email || "Not available"}
          </div>

          <div>
            <strong>Phone Numbers:</strong>
            {session.user?.phoneNumbers &&
            session.user.phoneNumbers.length > 0 ? (
              <ul className="ml-4">
                {session.user.phoneNumbers.map(
                  (phone: PhoneNumber, index: number) => (
                    <li key={index}>
                      {phone.value} ({phone.type || "Unknown type"})
                    </li>
                  )
                )}
              </ul>
            ) : (
              <span> Not available or not shared</span>
            )}
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="mt-6 w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto  rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-4">Welcome</h2>
      <p className="mb-4">Not signed in</p>
      <GoogleButton onClick={() => signIn("google")} />
    </div>
  );
}

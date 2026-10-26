import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Welcome back — Draftmango", "description": "Sign in to Draftmango. A home for your ideas, conversations, and saved projects."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme", "data-screen": "auth"}} styles={["/auth.css", "/app-type.css", "/accounts.css", "/public-theme.css"]}>{children}</DocumentLayout>; }

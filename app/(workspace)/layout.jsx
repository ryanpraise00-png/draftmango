import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Your workspace | Draftmango", "description": "Build and edit your website with a conversation, design controls, and live preview."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "workspace-clone", "data-screen": "builder"}} styles={["/workspace.css", "/app-type.css", "/accounts.css", "/application-ui.css", "/workspace-shell.css", "/publishing.css"]}>{children}</DocumentLayout>; }

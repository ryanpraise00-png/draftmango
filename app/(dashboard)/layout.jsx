import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Workspace — Draftmango", "description": ""};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"data-screen": "dashboard", "className": "workspace-clone"}} styles={["/dashboard.css", "/app-type.css", "/domains.css", "/accounts.css", "/application-ui.css", "/workspace-shell.css"]}>{children}</DocumentLayout>; }

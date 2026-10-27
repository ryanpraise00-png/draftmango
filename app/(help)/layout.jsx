import DocumentLayout from "../../components/DocumentLayout";
export const metadata = {"title": "Help | Draftmango", "description": "Answers about the Draftmango workspace, accounts, domains, pricing, exports and privacy."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme document-page", "data-screen": "information", "id": "top"}} styles={["/app-type.css", "/public-theme.css", "/legal.css"]}>{children}</DocumentLayout>; }

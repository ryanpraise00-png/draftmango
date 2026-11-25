import DocumentLayout from "../../components/DocumentLayout";
import {publicStyles} from "../../components/draftmango-styles";
export const metadata = {"title": "Help | Draftmango", "description": "Answers about the Draftmango workspace, accounts, domains, pricing, exports and privacy."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme document-page", "data-screen": "information", "id": "top"}} styles={publicStyles("/legal.css", "/draftmango-theme.css")}>{children}</DocumentLayout>; }

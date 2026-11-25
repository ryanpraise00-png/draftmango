import DocumentLayout from "../../components/DocumentLayout";
import {publicStyles} from "../../components/draftmango-styles";
export const metadata = {"title": "Plans & pricing | Draftmango", "description": "Explore Draftmango’s Free, Basic and Pro plans. Compare AI credits, websites and custom domain options."};
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "public-theme", "data-screen": "pricing"}} styles={publicStyles("/draftmango-theme.css")}>{children}</DocumentLayout>; }

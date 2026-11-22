import DocumentLayout from "../../components/DocumentLayout";
import {framoStyles} from "../../components/framo-styles";
export const metadata = {"title": "Workspace | Draftmango", "description": ""};
// Framo's stylesheets, the app UI, then the domain and store screens' own layouts.
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "dm-app workspace-clone", "data-screen": "dashboard"}} styles={[...framoStyles, "/app-ui.css", "/domains.css", "/stores.css"]}>{children}</DocumentLayout>; }

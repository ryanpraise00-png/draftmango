import DocumentLayout from "../../components/DocumentLayout";
import {framoStyles} from "../../components/framo-styles";
export const metadata = {"title": "Your workspace | Draftmango", "description": "Build and edit your website with a conversation, design controls, and live preview."};
// Framo's stylesheets, the app UI, then the publishing dialog's own layout.
export default function Layout({children}) { return <DocumentLayout bodyProps={{"className": "dm-app workspace-clone", "data-screen": "builder"}} styles={[...framoStyles, "/app-ui.css", "/publishing.css"]}>{children}</DocumentLayout>; }

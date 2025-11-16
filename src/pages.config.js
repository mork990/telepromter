import Home from './pages/Home';
import Recording from './pages/Recording';
import Settings from './pages/Settings';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Recording": Recording,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};
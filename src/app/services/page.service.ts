import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Page = "home" | "tableeditor" | "addcase" | "newtemplate" | "pttemplate" | "variant_list" | "help";

const validPages = ["home", "tableeditor", "addcase", "newtemplate", "pttemplate", "variant_list", "help"] as const;

export function isPage(value: string): value is Page {
    return (validPages as readonly string[]).includes(value);
}

@Injectable({
    providedIn: 'root'
})
export class PageService {
    private pageSubject = new BehaviorSubject<Page>("home");
    currentPage$ = this.pageSubject.asObservable();

    setPage(page: string) {
        if (isPage(page)) {
            this.pageSubject.next(page);
        } else {
            console.error("Invalid page:", page);
        }
    }

    getPage(): Page {
        return this.pageSubject.getValue();
    }

    getHome(): Page {
        return "home";
    }

    goToTemplateEditor(): void {
        this.setPage('pttemplate')
    }
}

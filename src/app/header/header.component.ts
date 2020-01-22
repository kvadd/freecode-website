import { Component, HostListener } from '@angular/core';
import { trigger, transition, animate, style, state } from '@angular/animations';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    animations: [
        trigger('slideIn', [
            state('*', style({ 'overflow-y': 'hidden' })),
            state('void', style({ 'overflow-y': 'hidden' })),
            transition('* => void', [
                style({ height: '*' }),
                animate(200, style({ height: 0 }))
            ]),
            transition('void => *', [
                style({ height: '0' }),
                animate(200, style({ height: '*' }))
            ])
        ])
    ]
})
export class HeaderComponent {

    public showMenu: boolean = false;
    public showHeaderBackground: boolean = false;

    public toggleMenu(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.showMenu = !this.showMenu;
    }

    @HostListener('document:click')
    public clickedOutside() {
        this.showMenu = false;
    }

    @HostListener('document:scroll', ['$event'])
    public scrollFunction(event: any) {
        this.showHeaderBackground = !!(event.target.documentElement.scrollTop > 400);
    }
}

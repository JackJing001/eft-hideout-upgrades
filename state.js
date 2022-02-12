const LS_KEY_HIGHLIGHTS = 'highlightedStations';

export class State {
    #highlightedStations = new Set();

    constructor() {
        this.load();
    }

    get highlightedStations() {
        return Array.from(this.#highlightedStations);
    }

    set highlightedStations(stations) {
        if (!(stations instanceof Array)) return;

        this.#highlightedStations = new Set(stations);

        if (localStorage) {
            localStorage.setItem(
                LS_KEY_HIGHLIGHTS,
                Array.from(this.#highlightedStations).join(',')
            );
        }
    }

    addHighlights(newHighlights) {
        newHighlights.forEach((h) => this.#highlightedStations.add(h));
        if (localStorage) {
            localStorage.setItem(
                LS_KEY_HIGHLIGHTS,
                Array.from(this.#highlightedStations).join(',')
            );
        }
    }

    clearHighlights() {
        this.#highlightedStations.clear();
        if (localStorage) {
            localStorage.setItem(LS_KEY_HIGHLIGHTS, '');
        }
    }

    load() {
        // load from localStorage, exit if no localStorage access
        if (!localStorage) return;

        const highlights = localStorage.getItem(LS_KEY_HIGHLIGHTS);
        if (highlights && highlights.length) {
            this.#highlightedStations = new Set(
                localStorage.getItem(LS_KEY_HIGHLIGHTS).split(',')
            );
        }
    }
}

export default State;

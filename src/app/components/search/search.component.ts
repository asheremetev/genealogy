import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { SearchOption } from '../../models/person.model';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
    readonly options = input.required<SearchOption[]>();
    readonly personSelected = output<string>();

    protected readonly query = signal('');
    protected readonly dropdownVisible = signal(false);

    protected readonly filteredOptions = computed<SearchOption[]>(() => {
        const q = this.query().toLowerCase().trim();
        if (!q) {
            return this.options();
        }
        return this.options().filter((o) => o.label.toLowerCase().includes(q));
    });

    protected onInput(e: Event): void {
        this.query.set((e.target as HTMLInputElement).value);
        this.dropdownVisible.set(true);
    }

    protected onFocus(): void {
        this.dropdownVisible.set(true);
    }

    protected onBlur(): void {
        setTimeout(() => this.dropdownVisible.set(false), 200);
    }

    protected selectOption(option: SearchOption): void {
        this.query.set(option.label);
        this.dropdownVisible.set(false);
        this.personSelected.emit(option.value);
    }
}

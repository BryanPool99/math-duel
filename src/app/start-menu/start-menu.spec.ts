import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StartMenuComponent } from './start-menu';

describe('StartMenuComponent', () => {
  let fixture: ComponentFixture<StartMenuComponent>;
  let component: StartMenuComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartMenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StartMenuComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the three difficulty options and the start action', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.difficulty-btn').length).toBe(3);
    expect(el.querySelector('.start-btn')).toBeTruthy();
    expect(el.querySelector('input[role="switch"]')).toBeTruthy();
  });

  it('selects a difficulty', () => {
    component.selectDifficulty('hard');
    expect(component.selectedDifficulty).toBe('hard');
  });
});

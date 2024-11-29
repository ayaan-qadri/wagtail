import { Application } from '@hotwired/stimulus';
import { ZoneController } from './ZoneController';

jest.useFakeTimers();

describe('ZoneController', () => {
  let application;

  const setup = async (html) => {
    document.body.innerHTML = `<main>${html}</main>`;

    application = Application.start();
    application.register('w-zone', ZoneController);

    await Promise.resolve();
  };

  afterEach(() => {
    application?.stop();
    jest.clearAllMocks();
  });

  describe('activate method', () => {
    it('should add active class to the element', async () => {
      await setup(`
        <div
          class="drop-zone"
          data-controller="w-zone"
          data-w-zone-active-class="hovered"
          data-action="dragover->w-zone#activate"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');
      element.dispatchEvent(new Event('dragover'));
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(true);
    });
  });

  describe('deactivate method', () => {
    it('should remove active class from the element', async () => {
      await setup(`
        <div
          class="drop-zone hovered"
          data-controller="w-zone"
          data-w-zone-mode-value="active"
          data-w-zone-active-class="hovered"
          data-action="dragleave->w-zone#deactivate"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');
      element.dispatchEvent(new Event('dragleave'));
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(false);
    });

    it('should not throw an error if active class is not present', async () => {
      await setup(`
        <div
          class="drop-zone"
          data-controller="w-zone"
          data-w-zone-active-class="hovered"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');
      expect(() => element.dispatchEvent(new Event('dragleave'))).not.toThrow();
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(false);
    });
  });

  describe('noop method', () => {
    it('should allow for arbitrary stimulus actions via the noop method', async () => {
      await setup(`
        <div
          class="drop-zone"
          data-controller="w-zone"
          data-w-zone-active-class="hovered"
          data-action="drop->w-zone#noop:prevent"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      element.dispatchEvent(dropEvent);
      await jest.runAllTimersAsync();
      expect(dropEvent.defaultPrevented).toBe(true);
    });
  });

  describe('delay value', () => {
    it('should delay the mode change by the provided value', async () => {
      await setup(`
        <div
          class="drop-zone"
          data-controller="w-zone"
          data-w-zone-active-class="active"
          data-w-zone-delay-value="100"
          data-action="dragover->w-zone#activate dragleave->w-zone#deactivate"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');

      element.dispatchEvent(new Event('dragover'));
      await Promise.resolve(jest.advanceTimersByTime(50));

      expect(element.classList.contains('active')).toBe(false);

      await jest.advanceTimersByTime(55);
      expect(element.classList.contains('active')).toBe(true);

      // deactivate should take twice as long (100 x 2 = 200ms)

      element.dispatchEvent(new Event('dragleave'));

      await Promise.resolve(jest.advanceTimersByTime(180));

      expect(element.classList.contains('active')).toBe(true);

      await Promise.resolve(jest.advanceTimersByTime(20));
      expect(element.classList.contains('active')).toBe(false);
    });
  });

  describe('example usage for drag & drop', () => {
    it('should handle multiple drag-related events correctly', async () => {
      await setup(`
        <div
          class="drop-zone"
          data-controller="w-zone"
          data-w-zone-active-class="hovered"
          data-action="dragover->w-zone#activate:prevent dragleave->w-zone#deactivate dragend->w-zone#deactivate"
        ></div>
      `);

      const element = document.querySelector('.drop-zone');

      // Simulate dragover
      const dragoverEvent = new Event('dragover', {
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(dragoverEvent);
      expect(dragoverEvent.defaultPrevented).toBe(true);
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(true);

      // Simulate dragleave
      element.dispatchEvent(new Event('dragleave'));
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(false);

      // Simulate dragover again for dragend
      element.dispatchEvent(dragoverEvent);
      expect(dragoverEvent.defaultPrevented).toBe(true);
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(true);

      // Simulate dragend
      element.dispatchEvent(new Event('dragend'));
      await jest.runAllTimersAsync();
      expect(element.classList.contains('hovered')).toBe(false);
    });
  });

  describe('switch method', () => {
    it('should set mode to ZoneMode.Active("active") if the key is truthy', async () => {
      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', {
        detail: { active: true },
      });
      element.dispatchEvent(event);

      const controller = application.getControllerForElementAndIdentifier(
        element,
        'w-zone',
      );
      expect(controller.modeValue).toBe('active');
    });

    it('should set mode to ZoneMode.Inactive("") if the key is falsy', async () => {
      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', {
        detail: { active: false },
      });
      element.dispatchEvent(event);

      const controller = application.getControllerForElementAndIdentifier(
        element,
        'w-zone',
      );
      expect(controller.modeValue).toBe('');
    });

    it('should log an error if the key is not found in the event detail or params', async () => {
      console.error = jest.fn(); // Mock console.error

      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', { detail: {} });
      element.dispatchEvent(event);

      expect(console.error).toHaveBeenCalledWith(
        'Switch key not found in event detail or params or data attribute of value',
      );
    });

    it('should handle negated keys correctly', async () => {
      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
          data-w-zone-switch-key-value="!active"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', {
        detail: { active: true },
      });
      element.dispatchEvent(event);

      const controller = application.getControllerForElementAndIdentifier(
        element,
        'w-zone',
      );
      expect(controller.modeValue).toBe(''); // Negated key means truthy value results in Inactive
    });

    it('should fall back to ZoneMode.Active("active") as the default key', async () => {
      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', {
        detail: { active: true },
      });
      element.dispatchEvent(event);

      const controller = application.getControllerForElementAndIdentifier(
        element,
        'w-zone',
      );
      expect(controller.modeValue).toBe('active');
    });

    it('should prioritize event-detail over params if both are present', async () => {
      await setup(`
        <div
          class="switch-zone"
          data-controller="w-zone"
          data-action="custom-event->w-zone#switch"
        ></div>
      `);

      const element = document.querySelector('.switch-zone');
      const event = new CustomEvent('custom-event', {
        detail: { active: true },
      });
      event.params = { active: false };

      element.dispatchEvent(event);

      const controller = application.getControllerForElementAndIdentifier(
        element,
        'w-zone',
      );
      expect(controller.modeValue).toBe('active'); // event-detail take precedence
    });
  });
});

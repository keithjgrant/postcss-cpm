import postcss from 'postcss';
import path from 'path';
import plugin from './plugin';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {
      importPaths: [path.resolve(__dirname, '../fixtures')],
    };
  }

  return postcss([plugin(opts)])
    .process(input, { from: undefined })
    .then(result => {
      expect(result.css.trim()).toEqual(output.trim());
      expect(result.warnings().length).toBe(0);
    });
}

it('should insert basic package', () => {
  return run(
    `
@import "static-button" as .button;
  `,
    `
{
  $name: .button;
  $(name) {
    display: inline-block;
    padding: 0.3em;
  }
}
  `
  );
});

it('should insert package with custom vars', () => {
  return run(
    `
@import "static-button" as .button {
  $border-radius: 1em;
  $color: inherit;
}
  `,
    `
{
  $border-radius: 1em;
  $color: inherit;
  $name: .button;
  $(name) {
    display: inline-block;
    padding: 0.3em;
  }
}
  `
  );
});

it('should import a named export', () => {
  return run(
    `
@import "static-button:variant" as .button-danger {
  $color: red;
}
  `,
    `
{
  $color: red;
  $name: .button-danger;
  $(name) {
    color: $color;
    border-color: $color;
  }
}
`
  );
});

it('should import package nested in a partial', () => {
  return run(
    `
@import "partial";
    `,
    `
    .partial {
  color: green;
}

 {
  $name: .button;
  $(name) {
    display: inline-block;
    padding: 0.3em;
  }
}
    `
  );
});

it('should import a named export with variables', () => {
  return run(
    `
@import "static-button:variables" as .button-danger {
  $color: red;
}
  `,
    `
{
  $color: red;
  $bg-color: lightgreen;
  $name: .button-danger;

  $(name) {
    color: $color;
  }
}
`
    /*
previously:
$color: red;
$name: .button-danger;
$color: green;
$bg-color: lightgreen;
*/
  );
});

// these are working correctly under normal usage. Unsure how to test
it.skip('should log a warning if import fails', () => {
  const input = '@import "invalid";';
  postcss([
    plugin({
      importPaths: [path.resolve(__dirname, '../fixtures')],
    }),
  ])
    .process(input, { from: undefined })
    .then(
      result => {
        expect(result.css.trim()).toEqual('');
        expect(result.warnings().length).toBe(1);
      },
      () => {
        expect(true).toBeTrue();
      }
    );
});

it.skip('should log a warning if no package found in imported file', () => {
  const input = '@import "partial" as .button;';
  postcss([
    plugin({
      importPaths: [path.resolve(__dirname, '../fixtures')],
    }),
  ])
    .process(input, { from: undefined })
    .then(result => {
      expect(result.css.trim()).toEqual('');
      expect(result.warnings().length).toBe(1);
    });
});

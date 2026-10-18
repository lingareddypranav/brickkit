"""Regression checks for nested OMR steps and the curated demo sequences."""
import importlib.util
from pathlib import Path
import unittest
import sys
sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location(
    'instructions', Path(__file__).with_name('prepare-instructions.py'))
instructions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(instructions)


class InstructionTests(unittest.TestCase):
    def test_nested_steps_keep_transform_and_inherited_colour(self):
        models = {
            'root.ldr': '1 4 100 20 30 0 0 -1 0 1 0 1 0 0 child.ldr',
            'child.ldr': '\n'.join([
                '1 16 10 0 0 1 0 0 0 1 0 0 0 1 3001.dat',
                '0 STEP',
                '1 2 0 5 0 1 0 0 0 1 0 0 0 1 3002.dat',
                '0 ROTSTEP 0 90 0 REL',
            ]),
        }
        steps = instructions.timeline(models, 'root.ldr')
        self.assertEqual(len(steps), 2)
        self.assertEqual(steps[0], ['1 4 100 20 40 0 0 -1 0 1 0 1 0 0 3001.dat'])
        self.assertEqual(steps[1], ['1 2 100 25 30 0 0 -1 0 1 0 1 0 0 3002.dat'])

    def test_part_definitions_remain_atomic(self):
        models = {
            'root.ldr': '1 7 0 0 0 1 0 0 0 1 0 0 0 1 custom.dat',
            'custom.dat': '1 4 0 0 0 1 0 0 0 1 0 0 0 1 s/subpart.dat',
        }
        self.assertEqual(instructions.timeline(models, 'root.ldr'), [[models['root.ldr']]])

    def test_curated_steps_use_every_original_piece_once(self):
        for model_id, recipe in instructions.CURATED.items():
            if 'groups' not in recipe:
                continue
            text = (instructions.FRONTEND/'public/demo/omr'/f'{model_id}.mpd').read_text()
            models, root = instructions.split_models(text)
            parts = instructions.refs(models[recipe.get('submodel', root)])
            self.assertEqual(sorted(i for group in recipe['groups'] for i in group), list(range(len(parts))))
            self.assertEqual(len(recipe['titles']), len(recipe['groups']))


if __name__ == '__main__':
    unittest.main()

"""Regression checks for nested OMR steps and the curated demo sequences."""
import importlib.util
from collections import Counter
import hashlib
import json
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
            parts = [line for step in instructions.timeline(models, recipe.get('submodel', root)) for line in step]
            self.assertEqual(sorted(i for group in recipe['groups'] for i in group), list(range(len(parts))))
            self.assertEqual(len(recipe['titles']), len(recipe['groups']))

    def test_unstepped_models_cannot_be_published_as_one_finished_picture(self):
        model = {'main.ldr': '1 4 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat'}
        with self.assertRaisesRegex(ValueError, 'curate this model first'):
            instructions.build_steps(model, 'main.ldr', {})

    def test_every_prepared_guide_matches_all_source_bricks_and_step_counts(self):
        catalog = json.loads((instructions.FRONTEND/'lib/demo/catalog-data.json').read_text())
        models_by_id = {model['id']: model for model in catalog['models']}
        guides = json.loads((instructions.FRONTEND/'lib/demo/instructions-data.json').read_text())
        self.assertGreaterEqual(len(instructions.CURATED), 13)
        for model_id, recipe in instructions.CURATED.items():
            with self.subTest(model=model_id):
                model = models_by_id[model_id]
                source = (instructions.FRONTEND/'public'/model['modelUrl'].lstrip('/')).read_text()
                guide = guides[model_id]
                self.assertEqual(guide['sourceSha256'], hashlib.sha256(source.encode()).hexdigest())
                original, root = instructions.split_models(source)
                expected = instructions.build_steps(original, root, recipe)
                prepared = (instructions.FRONTEND/'public'/guide['modelUrl'].lstrip('/')).read_text()
                blocks, main = instructions.split_models(prepared)
                actual = instructions.timeline(blocks, main)
                self.assertEqual(actual, expected)
                self.assertEqual(len(actual), len(guide['steps']))
                self.assertEqual(Counter(line for group in actual for line in group),
                                 Counter(line for group in instructions.timeline(original, root) for line in group))
                for step, ui_step in zip(actual, guide['steps']):
                    self.assertTrue(all(line.split(maxsplit=14)[14].lower().endswith('.dat') for line in step))
                    self.assertEqual(len(step), sum(piece['count'] for piece in ui_step['pieces']))


if __name__ == '__main__':
    unittest.main()
